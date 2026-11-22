from rest_framework import serializers
from .models import Order

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'item_type', 'item_id', 'item_title',
            'amount', 'currency', 'status', 'razorpay_order_id',
            'razorpay_payment_id', 'entitlement_granted', 'failure_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_id', 'amount', 'currency', 'status',
            'razorpay_order_id', 'razorpay_payment_id', 'entitlement_granted',
            'failure_reason', 'created_at', 'updated_at'
        ]

class CreateOrderSerializer(serializers.Serializer):
    item_type = serializers.ChoiceField(choices=['course', 'test', 'resource'])
    item_id = serializers.CharField(max_length=100, required=False)

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if not mutable_data.get('item_id'):
            item_type = mutable_data.get('item_type')
            if item_type == 'course':
                mutable_data['item_id'] = mutable_data.get('course_id') or mutable_data.get('course')
            elif item_type == 'test':
                mutable_data['item_id'] = mutable_data.get('test_id') or mutable_data.get('test_series_id') or mutable_data.get('test')
            elif item_type == 'resource':
                mutable_data['item_id'] = mutable_data.get('resource_id') or mutable_data.get('resource')
        return super().to_internal_value(mutable_data)

    def validate(self, attrs):
        if not attrs.get('item_id'):
            raise serializers.ValidationError({'item_id': 'Item ID is required.'})
        return attrs

class VerifyPaymentSerializer(serializers.Serializer):
    order_id = serializers.CharField(max_length=64)
    razorpay_payment_id = serializers.CharField(max_length=100)
    razorpay_signature = serializers.CharField(max_length=255)
