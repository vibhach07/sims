from django.urls import path
from .views import (
    CreateOrderView, VerifyPaymentView, OrderStatusView,
    RazorpayWebhookView, MyOrdersView, AdminOrdersListView, AdminUnreconciledOrdersView
)

urlpatterns = [
    path('', MyOrdersView.as_view(), name='my-orders'),
    path('create/', CreateOrderView.as_view(), name='create-order'),
    path('verify/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('<str:order_id>/status/', OrderStatusView.as_view(), name='order-status'),
    path('webhook/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
    path('admin/all/', AdminOrdersListView.as_view(), name='admin-orders-list'),
    path('admin/unreconciled/', AdminUnreconciledOrdersView.as_view(), name='admin-unreconciled-orders'),
]
