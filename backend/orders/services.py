import uuid
import hmac
import hashlib
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from .models import Order, PaymentWebhookLog
from courses.models import Course, UserEnrollment
from assessments.models import TestSeries, UserTestAccess
from resources.models import StudyResource, UserResourceEntitlement

class PaymentService:
    @staticmethod
    def is_real_razorpay_configured() -> bool:
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
        placeholders = [
            '', 'rzp_test_sims_placeholder', 'rzp_test_replace_me',
            'sims_secret_placeholder', 'replace_me_razorpay_secret'
        ]
        return bool(key_id and key_secret and key_id not in placeholders and key_secret not in placeholders)

    @staticmethod
    def get_item_and_price(item_type: str, item_id: str):
        if item_type == 'course':
            try:
                item = Course.objects.get(slug=item_id)
            except Course.DoesNotExist:
                item = Course.objects.get(id=item_id)
            return item, item.title, Decimal(str(item.price))
        elif item_type == 'test':
            try:
                item = TestSeries.objects.get(slug=item_id)
            except TestSeries.DoesNotExist:
                item = TestSeries.objects.get(id=item_id)
            return item, item.title, Decimal(str(item.price))
        elif item_type == 'resource':
            try:
                item = StudyResource.objects.get(slug=item_id)
            except StudyResource.DoesNotExist:
                item = StudyResource.objects.get(id=item_id)
            return item, item.title, Decimal(str(item.price))
        else:
            raise ValueError(f"Unsupported item type: {item_type}")

    @staticmethod
    def check_already_entitled(user, item_type: str, item) -> bool:
        if item_type == 'course':
            return UserEnrollment.objects.filter(user=user, course=item, is_active=True).exists()
        elif item_type == 'test':
            return UserTestAccess.objects.filter(user=user, test_series=item).exists()
        elif item_type == 'resource':
            return UserResourceEntitlement.objects.filter(user=user, resource=item).exists()
        return False

    @classmethod
    def create_pending_order(cls, user, item_type: str, item_id: str):
        item, title, authoritative_price = cls.get_item_and_price(item_type, item_id)
        
        if cls.check_already_entitled(user, item_type, item):
            raise ValueError("You are already enrolled or have active access to this item.")

        order_id = f"SIMS_ORD_{int(uuid.uuid4().hex[:10], 16)}"
        has_real_razorpay = cls.is_real_razorpay_configured()

        razorpay_order_id = ""
        if has_real_razorpay:
            try:
                import razorpay
                client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                rzp_order = client.order.create({
                    'amount': int(authoritative_price * 100), # in paise
                    'currency': 'INR',
                    'receipt': order_id,
                    'notes': {
                        'item_type': item_type,
                        'item_id': str(item_id),
                        'user_id': user.id,
                        'user_email': user.email
                    }
                })
                razorpay_order_id = rzp_order['id']
            except Exception as e:
                raise ValueError(f"Failed to communicate with payment gateway: {str(e)}")
        else:
            # Explicit sandbox tag
            razorpay_order_id = f"order_sandbox_{order_id}"

        order = Order.objects.create(
            order_id=order_id,
            user=user,
            item_type=item_type,
            item_id=str(item_id),
            item_title=title,
            amount=authoritative_price,
            status='pending',
            razorpay_order_id=razorpay_order_id,
            is_sandbox=not has_real_razorpay
        )

        return order

    @classmethod
    @transaction.atomic
    def grant_entitlement_for_order(cls, order: Order) -> bool:
        if order.entitlement_granted:
            return True

        item, _, _ = cls.get_item_and_price(order.item_type, order.item_id)
        if order.item_type == 'course':
            UserEnrollment.objects.get_or_create(user=order.user, course=item, defaults={'is_active': True})
        elif order.item_type == 'test':
            UserTestAccess.objects.get_or_create(user=order.user, test_series=item)
        elif order.item_type == 'resource':
            UserResourceEntitlement.objects.get_or_create(user=order.user, resource=item)

        order.entitlement_granted = True
        order.save(update_fields=['entitlement_granted', 'updated_at'])
        return True

    @classmethod
    @transaction.atomic
    def revoke_entitlement_for_order(cls, order: Order) -> bool:
        item, _, _ = cls.get_item_and_price(order.item_type, order.item_id)
        if order.item_type == 'course':
            UserEnrollment.objects.filter(user=order.user, course=item).update(is_active=False)
        elif order.item_type == 'test':
            UserTestAccess.objects.filter(user=order.user, test_series=item).delete()
        elif order.item_type == 'resource':
            UserResourceEntitlement.objects.filter(user=order.user, resource=item).delete()

        order.entitlement_granted = False
        order.status = 'refunded'
        order.save(update_fields=['status', 'entitlement_granted', 'updated_at'])
        return True

    @classmethod
    def verify_payment_signature(cls, order_id: str, razorpay_payment_id: str, razorpay_signature: str, user=None):
        try:
            order = Order.objects.get(order_id=order_id)
        except Order.DoesNotExist:
            raise ValueError("Order reference not found.")

        # Ensure order belongs to requesting student
        if user and order.user != user:
            raise PermissionError("Access denied: Order does not belong to your account.")

        # Idempotent response
        if order.status == 'paid' and order.entitlement_granted:
            return order, True

        has_real_razorpay = cls.is_real_razorpay_configured()

        if has_real_razorpay:
            if not razorpay_payment_id or not razorpay_signature:
                order.status = 'failed'
                order.failure_reason = "Missing payment ID or signature"
                order.save(update_fields=['status', 'failure_reason', 'updated_at'])
                raise ValueError("Payment verification failed: Incomplete payment credentials.")

            # Step 1: Cryptographic signature validation
            msg = f"{order.razorpay_order_id}|{razorpay_payment_id}".encode('utf-8')
            secret = settings.RAZORPAY_KEY_SECRET.encode('utf-8')
            expected_sig = hmac.new(secret, msg, hashlib.sha256).hexdigest()

            if not hmac.compare_digest(expected_sig, razorpay_signature):
                order.status = 'failed'
                order.failure_reason = "Cryptographic signature mismatch"
                order.save(update_fields=['status', 'failure_reason', 'updated_at'])
                raise ValueError("Payment verification failed: Invalid transaction signature.")

            # Step 2: Authoritative server-to-server gateway verification
            try:
                import razorpay
                client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                rzp_payment = client.payment.fetch(razorpay_payment_id)

                # Validate gateway order ID matches
                if rzp_payment.get('order_id') != order.razorpay_order_id:
                    order.status = 'failed'
                    order.failure_reason = "Payment order ID mismatch with gateway record"
                    order.save(update_fields=['status', 'failure_reason', 'updated_at'])
                    raise ValueError("Payment verification failed: Gateway order mismatch.")

                # Validate authoritative amount matches (in paise)
                expected_amount_paise = int(order.amount * 100)
                if rzp_payment.get('amount') != expected_amount_paise:
                    order.status = 'failed'
                    order.failure_reason = f"Gateway amount mismatch: expected {expected_amount_paise}, got {rzp_payment.get('amount')}"
                    order.save(update_fields=['status', 'failure_reason', 'updated_at'])
                    raise ValueError("Payment verification failed: Paid amount does not match order amount.")

                # Validate payment status
                payment_status = rzp_payment.get('status')
                if payment_status not in ('captured', 'authorized'):
                    order.status = 'failed'
                    order.failure_reason = f"Payment status '{payment_status}' is not successful"
                    order.save(update_fields=['status', 'failure_reason', 'updated_at'])
                    raise ValueError(f"Payment verification failed: Payment status is {payment_status}.")
            except Exception as e:
                if isinstance(e, ValueError):
                    raise
                order.status = 'failed'
                order.failure_reason = f"Gateway API verification error: {str(e)}"
                order.save(update_fields=['status', 'failure_reason', 'updated_at'])
                raise ValueError(f"Payment verification failed: {str(e)}")
        else:
            if not order.is_sandbox:
                raise ValueError("Payment gateway credentials not configured on server.")

        with transaction.atomic():
            # Mark paid
            order.status = 'paid'
            order.razorpay_payment_id = razorpay_payment_id
            order.razorpay_signature = razorpay_signature
            order.failure_reason = ""
            order.save(update_fields=['status', 'razorpay_payment_id', 'razorpay_signature', 'failure_reason', 'updated_at'])

            # Grant access
            cls.grant_entitlement_for_order(order)

        return order, False

    @classmethod
    @transaction.atomic
    def handle_webhook_event(cls, payload_bytes: bytes, signature_header: str):
        secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '') or getattr(settings, 'RAZORPAY_KEY_SECRET', '')
        if not secret:
            raise ValueError("Webhook secret is not configured on server.")

        expected_sig = hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, signature_header):
            raise ValueError("Invalid webhook signature.")

        import json
        payload = json.loads(payload_bytes.decode('utf-8'))
        event_id = payload.get('id') or f"evt_{uuid.uuid4().hex[:12]}"
        event_type = payload.get('event', '')

        # Idempotent deduplication check
        if PaymentWebhookLog.objects.filter(event_id=event_id).exists():
            return {"status": "ignored", "reason": "duplicate event"}

        log = PaymentWebhookLog.objects.create(
            event_id=event_id,
            event_type=event_type,
            payload_json=payload
        )

        try:
            if event_type in ['order.paid', 'payment.captured']:
                payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
                rzp_order_id = payment_entity.get('order_id')
                rzp_payment_id = payment_entity.get('id')

                if rzp_order_id:
                    order = Order.objects.select_for_update().filter(razorpay_order_id=rzp_order_id).first()
                    if order:
                        log.order = order
                        order.status = 'paid'
                        order.razorpay_payment_id = rzp_payment_id or order.razorpay_payment_id
                        order.failure_reason = ""
                        order.save(update_fields=['status', 'razorpay_payment_id', 'failure_reason', 'updated_at'])
                        cls.grant_entitlement_for_order(order)

            elif event_type == 'payment.failed':
                payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
                rzp_order_id = payment_entity.get('order_id')
                error_desc = payment_entity.get('error_description', 'Payment was declined by bank or user.')

                if rzp_order_id:
                    order = Order.objects.filter(razorpay_order_id=rzp_order_id).first()
                    if order and order.status != 'paid':
                        log.order = order
                        order.status = 'failed'
                        order.failure_reason = error_desc
                        order.save(update_fields=['status', 'failure_reason', 'updated_at'])

            elif event_type in ['refund.created', 'refund.processed']:
                refund_entity = payload.get('payload', {}).get('refund', {}).get('entity', {})
                payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
                rzp_payment_id = refund_entity.get('payment_id') or payment_entity.get('id')
                rzp_order_id = payment_entity.get('order_id')

                order = None
                if rzp_order_id:
                    order = Order.objects.filter(razorpay_order_id=rzp_order_id).first()
                if not order and rzp_payment_id:
                    order = Order.objects.filter(razorpay_payment_id=rzp_payment_id).first()

                if order:
                    log.order = order
                    cls.revoke_entitlement_for_order(order)

            log.is_processed = True
            log.save()
            return {"status": "success", "event": event_type}
        except Exception as e:
            log.error_message = str(e)
            log.save()
            raise e

    @classmethod
    def verify_and_grant_entitlement(cls, order_id: str, razorpay_payment_id: str, razorpay_signature: str, user=None):
        """Backward-compatible alias for existing unit tests and legacy callers."""
        return cls.verify_payment_signature(order_id, razorpay_payment_id, razorpay_signature, user=user)
