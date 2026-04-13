from rest_framework import serializers
from ..models.subscription_models import SubscriptionPlan, ReaderSubscription, PaymentTransaction


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Fields for Subscription Plan: name, description, 
    price_usd, frequency, features, updated_at,
    provider, external_price_id"""

    class Meta:
        model = SubscriptionPlan
        fields = [
            "id", 
            "name", 
            "description", 
            "price_usd", 
            "frequency", 
            "features",
            "updated_at",
            "provider",
            "external_price_id"
        ]


class ReaderSubscriptionSerializer(serializers.ModelSerializer):
    """Fields for Reader Subscription: reader_id, subscription_plan_id, 
    start_date, next_billing_date, last_billing_date, 
    status, is_auto_renewal, provider"""

    class Meta:
        model = ReaderSubscription
        fields = [
            "id", 
            "reader_id",
            "subscription_plan_id", 
            "start_date", 
            "next_billing_date", 
            "last_billing_date", 
            "status", 
            "is_auto_renewal", 
            "provider",
        ]


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Fields for Payment Transaction: reader_id, subscription_plan_id, 
    transaction_type, amount_usd, status, created_at, paid_at, 
    provider, external_transaction_id"""

    class Meta:
        model = PaymentTransaction
        fields = [
            "id", 
            "reader_id", 
            "subscription_plan_id", 
            "transaction_type", 
            "amount_usd", 
            "status", 
            "created_at", 
            "paid_at", 
            "provider", 
            "external_transaction_id"
        ]
        