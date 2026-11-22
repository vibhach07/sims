from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import Order, PaymentWebhookLog
from .serializers import OrderSerializer, CreateOrderSerializer, VerifyPaymentSerializer
from .services import PaymentService
from users.permissions import IsAdminUser

class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        item_type = serializer.validated_data['item_type']
        item_id = serializer.validated_data['item_id']

        try:
            order = PaymentService.create_pending_order(request.user, item_type, item_id)
            is_real = PaymentService.is_real_razorpay_configured()
            
            return Response({
                'order': OrderSerializer(order).data,
                'razorpay_key_id': settings.RAZORPAY_KEY_ID if is_real else '',
                'razorpay_order_id': order.razorpay_order_id,
                'amount': float(order.amount),
                'currency': order.currency,
                'is_sandbox': not is_real,
                'prefill': {
                    'name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
                    'email': request.user.email,
                    'contact': getattr(request.user.profile, 'phone', '') if hasattr(request.user, 'profile') else '',
                }
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': 'Failed to initialize payment order.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = VerifyPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        order_id = serializer.validated_data['order_id']
        razorpay_payment_id = serializer.validated_data.get('razorpay_payment_id')
        razorpay_signature = serializer.validated_data.get('razorpay_signature')

        try:
            order, was_already_paid = PaymentService.verify_payment_signature(
                order_id, razorpay_payment_id, razorpay_signature, user=request.user
            )
            return Response({
                'success': True,
                'order': OrderSerializer(order).data,
                'already_processed': was_already_paid,
                'message': 'Payment confirmed and access activated successfully.'
            })
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': 'Internal payment verification error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OrderStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Order, order_id=order_id, user=request.user)
        # Attempt recovery: if paid but not entitled, retry entitlement grant
        if order.status == 'paid' and not order.entitlement_granted:
            PaymentService.grant_entitlement_for_order(order)
            order.refresh_from_db()

        return Response({
            'order': OrderSerializer(order).data,
            'is_accessible': order.entitlement_granted,
        })

@method_decorator(csrf_exempt, name='dispatch')
class RazorpayWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        sig_header = request.headers.get('X-Razorpay-Signature', '')
        if not sig_header:
            return Response({'error': 'Missing signature header'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            res = PaymentService.handle_webhook_event(request.body, sig_header)
            return Response(res, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': 'Webhook processing error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MyOrdersView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

class AdminOrdersListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = OrderSerializer
    queryset = Order.objects.all().order_by('-created_at')

class AdminUnreconciledOrdersView(generics.ListAPIView):
    """
    Finds orders that are marked 'paid' but entitlement was not granted
    """
    permission_classes = [IsAdminUser]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(status='paid', entitlement_granted=False)
