from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.db import transaction, models
from django.utils import timezone
from users.models import AuditLog
from .models import (
    Coupon, CouponRedemption, ReferralCode, ReferralReward,
    Refund, Invoice, CreditNote, InvoiceSequence
)
from .pdf_utils import generate_invoice_pdf_bytes


class CouponService:
    @classmethod
    def validate_and_apply_coupon(cls, user, item_type: str, item_id: str, amount: Decimal, code: str):
        if not code:
            raise ValidationError("Coupon code is required.")
        code = code.strip().upper()

        with transaction.atomic():
            # Race-safe lock on the coupon row
            coupon = Coupon.objects.select_for_update().filter(code=code).first()
            if not coupon:
                raise ValidationError("Invalid coupon code.")

            if not coupon.is_active:
                raise ValidationError("This coupon is no longer active.")

            now = timezone.now()
            if now < coupon.valid_from:
                raise ValidationError("This coupon promotion has not started yet.")
            if now > coupon.valid_to:
                raise ValidationError("This coupon promotion has expired.")

            if amount < coupon.min_order_amount:
                raise ValidationError(f"Minimum order amount for this coupon is ₹{coupon.min_order_amount:.2f}.")

            if coupon.total_usage_limit is not None:
                total_used = CouponRedemption.objects.filter(coupon=coupon).count()
                if total_used >= coupon.total_usage_limit:
                    raise ValidationError("This coupon usage limit has been reached.")

            if user and user.is_authenticated:
                user_used = CouponRedemption.objects.filter(coupon=coupon, user=user).count()
                if user_used >= coupon.per_user_limit:
                    raise ValidationError("You have already used this coupon maximum allowed times.")

                if coupon.first_purchase_only:
                    from orders.models import Order
                    has_completed_order = Order.objects.filter(user=user, status='paid').exists()
                    if has_completed_order:
                        raise ValidationError("This coupon is valid only for first-time purchases.")

            # Scope checks
            if coupon.applicable_to == 'courses' and item_type != 'course':
                raise ValidationError("This coupon is only applicable to courses.")
            elif coupon.applicable_to == 'test_series' and item_type != 'test':
                raise ValidationError("This coupon is only applicable to test series.")
            elif coupon.applicable_to == 'resources' and item_type != 'resource':
                raise ValidationError("This coupon is only applicable to study materials.")

            if coupon.courses.exists() and item_type == 'course':
                if not coupon.courses.filter(id=item_id).exists():
                    raise ValidationError("This coupon is not applicable to the selected course.")

            if coupon.test_series.exists() and item_type == 'test':
                if not coupon.test_series.filter(id=item_id).exists():
                    raise ValidationError("This coupon is not applicable to the selected test series.")

            # Calculate discount
            if coupon.discount_type == 'percent':
                discount = (amount * coupon.value) / Decimal('100.00')
                if coupon.max_discount_cap is not None:
                    discount = min(discount, coupon.max_discount_cap)
            else:
                discount = min(coupon.value, amount)

            discount = discount.quantize(Decimal('0.01'))
            final_amount = max(Decimal('0.00'), amount - discount).quantize(Decimal('0.01'))

            return {
                'coupon': coupon,
                'discount_amount': discount,
                'final_amount': final_amount,
            }

    @classmethod
    def record_redemption(cls, coupon: Coupon, user, order, discount_amount: Decimal):
        with transaction.atomic():
            redemption = CouponRedemption.objects.create(
                coupon=coupon,
                user=user,
                order=order,
                discount_amount=discount_amount
            )
            AuditLog.objects.create(
                user=user if getattr(user, 'is_authenticated', False) else None,
                action='coupon_redeemed',
                object_type='coupon',
                object_id=str(coupon.id),
                object_title=f"Code {coupon.code} applied on Order {order.order_id}"
            )
            return redemption


class InvoiceService:
    @classmethod
    def get_current_financial_year(cls, d=None) -> str:
        d = d or timezone.localdate()
        # Indian FY runs from 1-April to 31-March
        year = d.year
        if d.month < 4:
            return f"{year - 1}-{str(year)[-2:]}"
        return f"{year}-{str(year + 1)[-2:]}"

    @classmethod
    def generate_next_invoice_number(cls, date=None) -> str:
        fy = cls.get_current_financial_year(date)
        with transaction.atomic():
            seq, _ = InvoiceSequence.objects.select_for_update().get_or_create(
                financial_year=fy,
                defaults={'last_number': 0}
            )
            seq.last_number += 1
            seq.save(update_fields=['last_number', 'updated_at'])
            return f"SIMS/{fy}/{seq.last_number:05d}"

    @classmethod
    def create_invoice_for_order(cls, order, billing_state: str = 'Chhattisgarh', gstin: str = ''):
        # 18% GST (9% CGST + 9% SGST for intrastate, 18% IGST for interstate)
        with transaction.atomic():
            existing = Invoice.objects.filter(order=order).first()
            if existing:
                return existing

            total_amount = Decimal(str(order.amount)).quantize(Decimal('0.01'))
            # Tax inclusive: Base = Total / 1.18
            taxable_amount = (total_amount / Decimal('1.18')).quantize(Decimal('0.01'))
            total_tax = total_amount - taxable_amount

            state_clean = (billing_state or 'Chhattisgarh').strip()
            is_chhattisgarh = 'chhattisgarh' in state_clean.lower()

            if is_chhattisgarh:
                cgst = (total_tax / Decimal('2.00')).quantize(Decimal('0.01'))
                sgst = total_tax - cgst
                igst = Decimal('0.00')
                state_code = '22'
            else:
                cgst = Decimal('0.00')
                sgst = Decimal('0.00')
                igst = total_tax
                state_code = '00'

            inv_number = cls.generate_next_invoice_number()
            invoice = Invoice.objects.create(
                invoice_number=inv_number,
                order=order,
                user=order.user,
                billing_name=order.user.get_full_name() or order.user.username,
                billing_address=getattr(getattr(order.user, 'profile', None), 'city', '') or state_clean,
                state=state_clean,
                state_code=state_code,
                gstin=gstin,
                taxable_amount=taxable_amount,
                cgst_amount=cgst,
                sgst_amount=sgst,
                igst_amount=igst,
                total_amount=total_amount,
            )

            # Generate PDF
            try:
                pdf_bytes = generate_invoice_pdf_bytes(invoice)
                invoice.pdf_file.save(f"{inv_number.replace('/', '_')}.pdf", ContentFile(pdf_bytes), save=True)
            except Exception:
                pass

            AuditLog.objects.create(
                user=order.user,
                action='invoice_generated',
                object_type='invoice',
                object_id=str(invoice.id),
                object_title=f"Invoice {inv_number} for Order {order.order_id}"
            )
            return invoice


class RefundService:
    @classmethod
    def process_refund_transition(cls, refund: Refund, target_status: str, admin_user=None, gateway_refund_id: str = ''):
        with transaction.atomic():
            refund = Refund.objects.select_for_update().get(id=refund.id)
            if not refund.can_transition_to(target_status):
                raise ValidationError(f"Invalid transition from {refund.status} to {target_status}.")

            refund.status = target_status
            if gateway_refund_id:
                refund.gateway_refund_id = gateway_refund_id

            if target_status == 'approved':
                refund.approved_by = admin_user
            elif target_status == 'completed':
                refund.processed_at = timezone.now()

                # Issue Credit Note if Invoice exists
                linked_inv = Invoice.objects.filter(order=refund.order).first()
                if linked_inv and not hasattr(refund, 'credit_note'):
                    fy = InvoiceService.get_current_financial_year()
                    cn_number = f"CN/{fy}/{refund.id:05d}"
                    ref_amt = refund.amount
                    taxable_ref = (ref_amt / Decimal('1.18')).quantize(Decimal('0.01'))
                    tax_ref = ref_amt - taxable_ref

                    if 'chhattisgarh' in linked_inv.state.lower():
                        cgst_ref = (tax_ref / Decimal('2.00')).quantize(Decimal('0.01'))
                        sgst_ref = tax_ref - cgst_ref
                        igst_ref = Decimal('0.00')
                    else:
                        cgst_ref = Decimal('0.00')
                        sgst_ref = Decimal('0.00')
                        igst_ref = tax_ref

                    CreditNote.objects.create(
                        credit_note_number=cn_number,
                        refund=refund,
                        invoice=linked_inv,
                        amount=ref_amt,
                        taxable_amount=taxable_ref,
                        cgst_amount=cgst_ref,
                        sgst_amount=sgst_ref,
                        igst_amount=igst_ref,
                        reason=refund.get_reason_display()
                    )

                # Revocation logic behind feature flag
                if getattr(settings, 'FEATURE_REFUNDS_REVOCATION_ENABLED', False):
                    cls.revoke_or_adjust_entitlement(refund)

            refund.save()

            AuditLog.objects.create(
                user=admin_user,
                action='refund_status_changed',
                object_type='refund',
                object_id=str(refund.id),
                object_title=f"Refund #{refund.id} moved to {target_status}"
            )
            return refund

    @classmethod
    def revoke_or_adjust_entitlement(cls, refund: Refund, dry_run: bool = False):
        order = refund.order
        user = order.user
        item_type = order.item_type
        item_id = order.item_id

        revocation_summary = {
            'order_id': order.order_id,
            'user': user.username,
            'item_type': item_type,
            'item_id': item_id,
            'revoked': False
        }

        if dry_run:
            revocation_summary['dry_run'] = True
            return revocation_summary

        if item_type == 'course':
            from courses.models import UserEnrollment
            enrollment = UserEnrollment.objects.filter(user=user, course_id=item_id).first()
            if enrollment:
                enrollment.delete()
                revocation_summary['revoked'] = True
        elif item_type == 'test':
            from assessments.models import UserTestAccess
            access = UserTestAccess.objects.filter(user=user, test_series_id=item_id).first()
            if access:
                access.delete()
                revocation_summary['revoked'] = True
        elif item_type == 'resource':
            from resources.models import UserResourceEntitlement
            entitlement = UserResourceEntitlement.objects.filter(user=user, resource_id=item_id).first()
            if entitlement:
                entitlement.delete()
                revocation_summary['revoked'] = True

        return revocation_summary
