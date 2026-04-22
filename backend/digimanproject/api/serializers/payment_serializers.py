from rest_framework import serializers
from ..models.subscription_models import SubscriptionPlan, PaymentProviderChoices


class CreateCheckoutSessionSerializer(serializers.Serializer):
    planId = serializers.UUIDField()
    provider = serializers.ChoiceField(choices=PaymentProviderChoices.choices)

    def validate_planId(self, value: str):
        if not SubscriptionPlan.objects.filter(id=value).exists():
            raise serializers.ValidationError("Invalid plan ID.")
        return value