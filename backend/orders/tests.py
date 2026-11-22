from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from unittest.mock import patch, MagicMock
from decimal import Decimal
import hmac
import hashlib
import json

from courses.models import Course, UserEnrollment
from assessments.models import TestSeries, UserTestAccess
from resources.models import StudyResource, UserResourceEntitlement
from orders.models import Order, PaymentWebhookLog
from orders.services import PaymentService


@override_settings(
    RAZORPAY_KEY_ID='rzp_test_sims_valid_id',
    RAZORPAY_KEY_SECRET='sims_secret_key_mock_98765',
    RAZORPAY_WEBHOOK_SECRET='whsec_sims_secret_54321'
)
class PaymentFlowTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='teststudent@sims.in', email='teststudent@sims.in', password='pass')
        self.other_user = User.objects.create_user(username='other@sims.in', email='other@sims.in', password='pass')
        self.course = Course.objects.create(
            slug='test-course',
            title='Test Course',
            price=Decimal('4999.00'),
            is_paid=True
        )
        self.test_series = TestSeries.objects.create(
            slug='test-mock',
            title='Test Mock Pack',
            price=Decimal('999.00'),
            is_paid=True
        )
        self.resource = StudyResource.objects.create(
            slug='test-resource',
            title='Test Formula Sheet',
            price=Decimal('299.00'),
            is_paid=True
        )

    @patch('razorpay.Client')
    def test_order_creation_uses_authoritative_price_and_rzp_order(self, mock_rzp_client):
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {'id': 'order_rzp_abc123', 'amount': 499900}
        mock_rzp_client.return_value = mock_instance

        order = PaymentService.create_pending_order(self.user, 'course', self.course.slug)
        self.assertEqual(order.amount, Decimal('4999.00'))
        self.assertEqual(order.status, 'pending')
        self.assertEqual(order.razorpay_order_id, 'order_rzp_abc123')
        mock_instance.order.create.assert_called_once_with({
            'amount': 499900,
            'currency': 'INR',
            'receipt': order.order_id,
            'notes': {
                'item_type': 'course',
                'item_id': self.course.slug,
                'user_id': self.user.id,
                'user_email': self.user.email
            }
        })

    @patch('razorpay.Client')
    def test_payment_verification_grants_course_enrollment(self, mock_rzp_client):
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {'id': 'order_rzp_test_1', 'amount': 499900}
        mock_instance.payment.fetch.return_value = {
            'id': 'pay_test_123',
            'order_id': 'order_rzp_test_1',
            'amount': 499900,
            'status': 'captured'
        }
        mock_rzp_client.return_value = mock_instance

        order = PaymentService.create_pending_order(self.user, 'course', self.course.slug)
        
        # Valid HMAC signature
        msg = f"{order.razorpay_order_id}|pay_test_123".encode('utf-8')
        sig = hmac.new(b'sims_secret_key_mock_98765', msg, hashlib.sha256).hexdigest()

        verified_order, already_paid = PaymentService.verify_payment_signature(
            order.order_id, 'pay_test_123', sig, user=self.user
        )
        self.assertEqual(verified_order.status, 'paid')
        self.assertEqual(verified_order.razorpay_payment_id, 'pay_test_123')
        self.assertFalse(already_paid)
        self.assertTrue(UserEnrollment.objects.filter(user=self.user, course=self.course, is_active=True).exists())

    @patch('razorpay.Client')
    def test_signature_mismatch_fails_and_no_access(self, mock_rzp_client):
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {'id': 'order_rzp_sig_fail', 'amount': 499900}
        mock_rzp_client.return_value = mock_instance

        order = PaymentService.create_pending_order(self.user, 'course', self.course.slug)

        with self.assertRaises(ValueError) as ctx:
            PaymentService.verify_payment_signature(
                order.order_id, 'pay_test_123', 'invalid_signature_hex', user=self.user
            )
        self.assertIn("Invalid transaction signature", str(ctx.exception))
        order.refresh_from_db()
        self.assertEqual(order.status, 'failed')
        self.assertFalse(order.entitlement_granted)
        self.assertFalse(UserEnrollment.objects.filter(user=self.user, course=self.course).exists())

    @patch('razorpay.Client')
    def test_amount_mismatch_fails_and_no_access(self, mock_rzp_client):
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {'id': 'order_rzp_tamper', 'amount': 499900}
        # Razorpay payment report says only 100 paise paid instead of 499900
        mock_instance.payment.fetch.return_value = {
            'id': 'pay_tampered',
            'order_id': 'order_rzp_tamper',
            'amount': 100,
            'status': 'captured'
        }
        mock_rzp_client.return_value = mock_instance

        order = PaymentService.create_pending_order(self.user, 'course', self.course.slug)
        msg = f"{order.razorpay_order_id}|pay_tampered".encode('utf-8')
        sig = hmac.new(b'sims_secret_key_mock_98765', msg, hashlib.sha256).hexdigest()

        with self.assertRaises(ValueError) as ctx:
            PaymentService.verify_payment_signature(
                order.order_id, 'pay_tampered', sig, user=self.user
            )
        self.assertIn("Paid amount does not match order amount", str(ctx.exception))
        order.refresh_from_db()
        self.assertEqual(order.status, 'failed')
        self.assertFalse(UserEnrollment.objects.filter(user=self.user, course=self.course).exists())

    @patch('razorpay.Client')
    def test_user_cannot_verify_another_students_order(self, mock_rzp_client):
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {'id': 'order_rzp_isolation', 'amount': 499900}
        mock_rzp_client.return_value = mock_instance

        order = PaymentService.create_pending_order(self.user, 'course', self.course.slug)

        with self.assertRaises(PermissionError):
            PaymentService.verify_payment_signature(
                order.order_id, 'pay_isolation_1', 'some_sig', user=self.other_user
            )

    def test_prevent_duplicate_orders_when_already_enrolled(self):
        UserEnrollment.objects.create(user=self.user, course=self.course, is_active=True)
        with self.assertRaises(ValueError):
            PaymentService.create_pending_order(self.user, 'course', self.course.slug)

    @patch('razorpay.Client')
    def test_payment_verification_grants_test_access(self, mock_rzp_client):
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {'id': 'order_rzp_test_ser', 'amount': 99900}
        mock_instance.payment.fetch.return_value = {
            'id': 'pay_test_456',
            'order_id': 'order_rzp_test_ser',
            'amount': 99900,
            'status': 'captured'
        }
        mock_rzp_client.return_value = mock_instance

        order = PaymentService.create_pending_order(self.user, 'test', self.test_series.slug)
        msg = f"{order.razorpay_order_id}|pay_test_456".encode('utf-8')
        sig = hmac.new(b'sims_secret_key_mock_98765', msg, hashlib.sha256).hexdigest()

        verified_order, _ = PaymentService.verify_payment_signature(order.order_id, 'pay_test_456', sig, user=self.user)
        self.assertEqual(verified_order.status, 'paid')
        self.assertTrue(UserTestAccess.objects.filter(user=self.user, test_series=self.test_series).exists())

    @patch('razorpay.Client')
    def test_payment_verification_grants_resource_entitlement(self, mock_rzp_client):
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {'id': 'order_rzp_res', 'amount': 29900}
        mock_instance.payment.fetch.return_value = {
            'id': 'pay_test_789',
            'order_id': 'order_rzp_res',
            'amount': 29900,
            'status': 'captured'
        }
        mock_rzp_client.return_value = mock_instance

        order = PaymentService.create_pending_order(self.user, 'resource', self.resource.slug)
        msg = f"{order.razorpay_order_id}|pay_test_789".encode('utf-8')
        sig = hmac.new(b'sims_secret_key_mock_98765', msg, hashlib.sha256).hexdigest()

        verified_order, _ = PaymentService.verify_payment_signature(order.order_id, 'pay_test_789', sig, user=self.user)
        self.assertEqual(verified_order.status, 'paid')
        self.assertTrue(UserResourceEntitlement.objects.filter(user=self.user, resource=self.resource).exists())


@override_settings(
    RAZORPAY_KEY_ID='rzp_test_sims_valid_id',
    RAZORPAY_KEY_SECRET='sims_secret_key_mock_98765',
    RAZORPAY_WEBHOOK_SECRET='whsec_sims_secret_54321'
)
class RazorpayWebhookTestCase(TestCase):
    @patch('razorpay.Client')
    def setUp(self, mock_rzp_client):
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {'id': 'order_rzp_wh_1', 'amount': 199900}
        mock_rzp_client.return_value = mock_instance

        self.user = User.objects.create_user('webhook_user', 'wh@sims.in', 'pass123')
        self.course = Course.objects.create(
            slug='test-webhook-course',
            title='Webhook Course',
            price=Decimal('1999.00')
        )
        self.order = PaymentService.create_pending_order(self.user, 'course', self.course.slug)

    def test_webhook_order_paid_grants_access_and_deduplicates(self):
        payload = {
            "id": "evt_test_unique_123",
            "event": "order.paid",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_real_987",
                        "order_id": self.order.razorpay_order_id,
                        "amount": 199900
                    }
                }
            }
        }
        payload_bytes = json.dumps(payload).encode('utf-8')
        secret = b'whsec_sims_secret_54321'
        sig = hmac.new(secret, payload_bytes, hashlib.sha256).hexdigest()

        # Call 1: Success
        res1 = PaymentService.handle_webhook_event(payload_bytes, sig)
        self.assertEqual(res1['status'], 'success')
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'paid')
        self.assertEqual(self.order.razorpay_payment_id, 'pay_real_987')
        self.assertTrue(self.order.entitlement_granted)
        self.assertTrue(UserEnrollment.objects.filter(user=self.user, course=self.course, is_active=True).exists())

        # Call 2: Duplicate delivery should be safely ignored
        res2 = PaymentService.handle_webhook_event(payload_bytes, sig)
        self.assertEqual(res2['status'], 'ignored')
        self.assertEqual(res2['reason'], 'duplicate event')

    def test_webhook_payment_failed_records_reason_and_no_access(self):
        payload = {
            "id": "evt_test_failed_456",
            "event": "payment.failed",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_failed_001",
                        "order_id": self.order.razorpay_order_id,
                        "error_description": "Card was declined due to insufficient funds."
                    }
                }
            }
        }
        payload_bytes = json.dumps(payload).encode('utf-8')
        sig = hmac.new(b'whsec_sims_secret_54321', payload_bytes, hashlib.sha256).hexdigest()

        res = PaymentService.handle_webhook_event(payload_bytes, sig)
        self.assertEqual(res['status'], 'success')
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'failed')
        self.assertIn("Card was declined", self.order.failure_reason)
        self.assertFalse(self.order.entitlement_granted)
        self.assertFalse(UserEnrollment.objects.filter(user=self.user, course=self.course).exists())

    def test_webhook_refund_revokes_access(self):
        # First enroll and mark paid
        self.order.status = 'paid'
        self.order.razorpay_payment_id = 'pay_to_refund_789'
        self.order.save()
        PaymentService.grant_entitlement_for_order(self.order)
        self.assertTrue(UserEnrollment.objects.filter(user=self.user, course=self.course, is_active=True).exists())

        payload = {
            "id": "evt_test_refund_999",
            "event": "refund.processed",
            "payload": {
                "refund": {
                    "entity": {
                        "id": "rfnd_12345",
                        "payment_id": "pay_to_refund_789",
                        "amount": 199900
                    }
                },
                "payment": {
                    "entity": {
                        "id": "pay_to_refund_789",
                        "order_id": self.order.razorpay_order_id
                    }
                }
            }
        }
        payload_bytes = json.dumps(payload).encode('utf-8')
        sig = hmac.new(b'whsec_sims_secret_54321', payload_bytes, hashlib.sha256).hexdigest()

        res = PaymentService.handle_webhook_event(payload_bytes, sig)
        self.assertEqual(res['status'], 'success')
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'refunded')
        self.assertFalse(self.order.entitlement_granted)
        # Enrollment revoked (is_active=False)
        self.assertFalse(UserEnrollment.objects.filter(user=self.user, course=self.course, is_active=True).exists())

    def test_webhook_invalid_signature_raises_error(self):
        payload_bytes = b'{"id": "evt_fake", "event": "order.paid"}'
        with self.assertRaises(ValueError) as ctx:
            PaymentService.handle_webhook_event(payload_bytes, 'bad_signature_header')
        self.assertIn("Invalid webhook signature", str(ctx.exception))
