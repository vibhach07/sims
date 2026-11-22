from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = (
        ('percent', 'Percentage (%)'),
        ('flat', 'Flat Amount (₹)'),
    )
    APPLICABLE_CHOICES = (
        ('all', 'All Offerings'),
        ('courses', 'Courses Only'),
        ('test_series', 'Test Series Only'),
        ('resources', 'Study Resources Only'),
    )

    code = models.CharField(max_length=50, unique=True, db_index=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='percent')
    value = models.DecimalField(max_digits=10, decimal_places=2)
    max_discount_cap = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    valid_from = models.DateTimeField(db_index=True)
    valid_to = models.DateTimeField(db_index=True)
    total_usage_limit = models.PositiveIntegerField(null=True, blank=True)
    per_user_limit = models.PositiveIntegerField(default=1)
    applicable_to = models.CharField(max_length=20, choices=APPLICABLE_CHOICES, default='all')
    courses = models.ManyToManyField('courses.Course', blank=True, related_name='+')
    test_series = models.ManyToManyField('assessments.TestSeries', blank=True, related_name='+')
    first_purchase_only = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Coupon'
        verbose_name_plural = 'Coupons'
        permissions = [
            ('can_manage_coupons', 'Can manage coupons and promotions'),
        ]

    def __str__(self):
        return f"{self.code} ({self.get_discount_type_display()} - {self.value})"

    def clean_code(self):
        if self.code:
            self.code = self.code.strip().upper()

    def save(self, *args, **kwargs):
        self.clean_code()
        super().save(*args, **kwargs)

    @property
    def redemptions_count(self):
        return self.redemptions.count()

    @property
    def remaining_usage(self):
        if self.total_usage_limit is None:
            return 'Unlimited'
        used = self.redemptions.count()
        return max(0, self.total_usage_limit - used)

    def is_currently_valid(self):
        now = timezone.now()
        if not self.is_active:
            return False
        if not (self.valid_from <= now <= self.valid_to):
            return False
        if self.total_usage_limit is not None and self.redemptions.count() >= self.total_usage_limit:
            return False
        return True


class CouponRedemption(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.PROTECT, related_name='redemptions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='coupon_redemptions')
    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='coupon_redemptions')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    redeemed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-redeemed_at']
        verbose_name = 'Coupon Redemption'
        verbose_name_plural = 'Coupon Redemptions'
        indexes = [
            models.Index(fields=['coupon', 'user']),
        ]

    def __str__(self):
        return f"{self.user} redeemed {self.coupon.code} for ₹{self.discount_amount}"


class ReferralCode(models.Model):
    REWARD_TYPE_CHOICES = (
        ('discount', 'Discount Voucher'),
        ('wallet_credit', 'Wallet Credit'),
    )

    referrer = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='sales_referral_code'
    )
    code = models.CharField(max_length=30, unique=True, db_index=True)
    reward_type = models.CharField(max_length=20, choices=REWARD_TYPE_CHOICES, default='discount')
    reward_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('100.00'))
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Referral Code'
        verbose_name_plural = 'Referral Codes'

    def __str__(self):
        return f"Ref: {self.code} ({self.referrer})"

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.strip().upper()
        super().save(*args, **kwargs)


class ReferralReward(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('credited', 'Credited / Issued'),
        ('expired', 'Expired'),
    )

    referral_code = models.ForeignKey(ReferralCode, on_delete=models.PROTECT, related_name='rewards')
    referee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='+')
    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    reward_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Referral Reward'
        verbose_name_plural = 'Referral Rewards'

    def __str__(self):
        return f"Reward ₹{self.reward_amount} for {self.referral_code.referrer} ({self.status})"


class Refund(models.Model):
    STATUS_CHOICES = (
        ('requested', 'Requested'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('processing', 'Processing Gateway'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    REASON_CHOICES = (
        ('course_dissatisfaction', 'Course / Teaching Dissatisfaction'),
        ('double_payment', 'Accidental Double Payment'),
        ('technical_issue', 'Portal / Video Access Failure'),
        ('batch_cancelled', 'Batch / Exam Schedule Cancelled'),
        ('other', 'Other Policy Reason'),
    )

    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='sales_refunds')
    payment = models.ForeignKey('orders.Payment', on_delete=models.PROTECT, null=True, blank=True, related_name='sales_refunds')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_partial = models.BooleanField(default=False)
    reason = models.CharField(max_length=50, choices=REASON_CHOICES, default='course_dissatisfaction')
    reason_text = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested', db_index=True)
    gateway_refund_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Refund'
        verbose_name_plural = 'Refunds'
        permissions = [
            ('can_approve_refund', 'Can approve refund request'),
            ('can_process_refund', 'Can process gateway refund'),
        ]

    def __str__(self):
        return f"Refund #{self.id} for Order {self.order.order_id} - ₹{self.amount} ({self.status})"

    def can_transition_to(self, target_status: str) -> bool:
        valid_transitions = {
            'requested': ['approved', 'rejected'],
            'approved': ['processing', 'rejected'],
            'rejected': [],
            'processing': ['completed', 'failed'],
            'completed': [],
            'failed': ['processing', 'rejected'],
        }
        return target_status in valid_transitions.get(self.status, [])


class InvoiceSequence(models.Model):
    financial_year = models.CharField(max_length=10, unique=True, db_index=True)
    last_number = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Invoice Sequence'
        verbose_name_plural = 'Invoice Sequences'

    def __str__(self):
        return f"FY {self.financial_year} - Last #{self.last_number}"


class Invoice(models.Model):
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='sales_invoices')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='sales_invoices')
    billing_name = models.CharField(max_length=200)
    billing_address = models.TextField(blank=True, default='')
    state = models.CharField(max_length=100, default='Chhattisgarh')
    state_code = models.CharField(max_length=5, default='22')
    gstin = models.CharField(max_length=20, blank=True, default='')
    taxable_amount = models.DecimalField(max_digits=10, decimal_places=2)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    igst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    pdf_file = models.FileField(upload_to='invoices/%Y/%m/', null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-issued_at']
        verbose_name = 'GST Tax Invoice'
        verbose_name_plural = 'GST Tax Invoices'
        permissions = [
            ('can_issue_invoice', 'Can issue and sign GST tax invoice'),
        ]

    def __str__(self):
        return f"{self.invoice_number} (Order {self.order.order_id} - ₹{self.total_amount})"


class CreditNote(models.Model):
    credit_note_number = models.CharField(max_length=50, unique=True, db_index=True)
    refund = models.OneToOneField(Refund, on_delete=models.PROTECT, related_name='credit_note')
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='credit_notes')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    taxable_amount = models.DecimalField(max_digits=10, decimal_places=2)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    igst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    reason = models.TextField(blank=True, default='')
    pdf_file = models.FileField(upload_to='credit_notes/%Y/%m/', null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-issued_at']
        verbose_name = 'GST Credit Note'
        verbose_name_plural = 'GST Credit Notes'

    def __str__(self):
        return f"{self.credit_note_number} (Refund #{self.refund_id} - ₹{self.amount})"
