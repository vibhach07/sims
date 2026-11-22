from django.db import models
from django.contrib.auth.models import User

class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    )

    ITEM_TYPE_CHOICES = (
        ('course', 'Course'),
        ('test', 'Test Series'),
        ('resource', 'Study Resource'),
    )

    order_id = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    item_id = models.CharField(max_length=100) # slug or database id
    item_title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2) # Authoritative price
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    razorpay_order_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, default='')
    razorpay_signature = models.CharField(max_length=255, blank=True, default='')

    entitlement_granted = models.BooleanField(default=False)
    failure_reason = models.TextField(blank=True, default='')
    is_sandbox = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'

    def __str__(self):
        return f"{self.order_id} - {self.user.username} - ₹{self.amount} ({self.status})"


class Payment(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    transaction_id = models.CharField(max_length=100, unique=True)
    gateway = models.CharField(max_length=50, default='razorpay')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, default='paid')
    payment_method = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.transaction_id} - ₹{self.amount} ({self.status})"


class PaymentWebhookLog(models.Model):
    event_id = models.CharField(max_length=120, unique=True, db_index=True)
    event_type = models.CharField(max_length=100)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='webhook_logs')
    payload_json = models.JSONField(default=dict)
    is_processed = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, default='')
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.event_type} - {self.event_id} (Processed: {self.is_processed})"
