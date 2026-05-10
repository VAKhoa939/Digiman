from rest_framework import serializers
from ..models.subscription_models import SubscriptionPlan, ReaderSubscription, PaymentTransaction


"""Subscription Model Serializers"""

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Fields for Subscription Plan: id, name, description, price_usd, frequency"""

    class Meta:
        model = SubscriptionPlan
        fields = [
            "id", 
            "name", 
            "description", 
            "price_usd", 
            "frequency", 
        ]


class ReaderSubscriptionSerializer(serializers.ModelSerializer):
    """Fields for Reader Subscription: id, reader_id, subscription_plan_id, 
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
        

"""Custom Subscription Serializers"""

class SubscriptionMeSerializer(serializers.Serializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['reader_subscription'] = serializers.SerializerMethodField()

    def get_reader_subscription(self, reader_id):
        try:
            subscription = ReaderSubscription.objects.get(reader_id=reader_id)
            plan = subscription.get_plan()
            #latest_transaction = PaymentTransaction.objects.filter(reader_id=reader_id).order_by("-created_at").first()
            #serialized_latest_transaction = PaymentTransactionSerializer(latest_transaction).data if latest_transaction else None

            return {
                "id": subscription.id, 
                "plan_name": plan.get_name(), 
                "features": plan.get_features(), 
                "description": plan.get_description(),
                "status": subscription.status, 
                "is_active": subscription.check_active(),
                "last_payment_status": subscription.last_payment_status,
                "is_auto_renewal": subscription.is_auto_renewal,
                "next_billing_date": subscription.next_billing_date, 
                "last_billing_date": subscription.last_billing_date,
                #"latest_transaction": serialized_latest_transaction
            }
        except ReaderSubscription.DoesNotExist:
            return None
