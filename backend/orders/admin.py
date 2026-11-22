from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.decorators import display
from .models import Order, PaymentWebhookLog, Payment


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = (
        'order_id',
        'student_details',
        'item_type',
        'item_title',
        'amount',
        'currency',
        'razorpay_payment_id',
        'show_status',
        'refund_status',
        'entitlement_granted',
        'created_at',
    )
    list_filter = ('status', 'item_type', 'entitlement_granted', 'is_sandbox', 'created_at')
    search_fields = ('order_id', 'razorpay_order_id', 'razorpay_payment_id', 'user__username', 'user__email', 'item_title')
    readonly_fields = (
        'order_id',
        'user',
        'item_type',
        'item_id',
        'item_title',
        'amount',
        'currency',
        'razorpay_order_id',
        'razorpay_payment_id',
        'failure_reason',
        'created_at',
        'updated_at',
    )
    raw_id_fields = ('user',)
    ordering = ('-created_at',)
    list_per_page = 25

    fieldsets = (
        ('Order Overview', {
            'fields': ('order_id', 'user', 'item_type', 'item_id', 'item_title', 'status', 'entitlement_granted', 'failure_reason')
        }),
        ('Payment Details', {
            'fields': ('amount', 'currency', 'is_sandbox', 'razorpay_order_id', 'razorpay_payment_id')
        }),
        ('Audit Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    @display(description='Student Details')
    def student_details(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return f"{name} ({obj.user.email})"

    @display(description='Refund', label={'refunded': 'danger', '-': 'secondary'})
    def refund_status(self, obj):
        return 'refunded' if obj.status == 'refunded' else '-'

    @display(description='Status', label={
        'paid': 'success',
        'created': 'warning',
        'failed': 'danger',
        'refunded': 'secondary',
    })
    def show_status(self, obj):
        return obj.status

    def has_delete_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        # Allow viewing detail form in admin, but fields are read-only
        return True


@admin.register(PaymentWebhookLog)
class PaymentWebhookLogAdmin(ModelAdmin):
    list_display = ('event_id', 'event_type', 'order', 'show_processed', 'received_at')
    list_filter = ('event_type', 'is_processed', 'received_at')
    search_fields = ('event_id', 'event_type', 'order__order_id')
    readonly_fields = ('event_id', 'event_type', 'order', 'payload_json', 'error_message', 'is_processed', 'received_at')
    raw_id_fields = ('order',)
    ordering = ('-received_at',)
    list_per_page = 25

    fieldsets = (
        ('Event Information', {
            'fields': ('event_id', 'event_type', 'order', 'is_processed', 'received_at')
        }),
        ('Payload & Diagnostics', {
            'fields': ('payload_json', 'error_message')
        }),
    )

    @display(description='Processed', boolean=True)
    def show_processed(self, obj):
        return obj.is_processed

    def has_delete_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return False


@admin.register(Payment)
class PaymentAdmin(ModelAdmin):
    list_display = ('transaction_id', 'order', 'amount', 'currency', 'gateway', 'status', 'created_at')
    list_filter = ('status', 'gateway', 'created_at')
    search_fields = ('transaction_id', 'order__order_id', 'order__user__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
