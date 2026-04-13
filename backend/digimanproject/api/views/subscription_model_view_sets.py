from rest_framework import viewsets

from ..models.subscription_models import SubscriptionPlan, ReaderSubscription, PaymentTransaction
from ..serializers.subscription_model_serializers import SubscriptionPlanSerializer, ReaderSubscriptionSerializer, PaymentTransactionSerializer

from ..permissions.admin_permissions import AdminWriteOnly


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all().order_by("price_usd")
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [AdminWriteOnly]


class ReaderSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = ReaderSubscription.objects.all()
    serializer_class = ReaderSubscriptionSerializer
    permission_classes = [AdminWriteOnly]


class PaymentTransactionViewSet(viewsets.ModelViewSet):
    queryset = PaymentTransaction.objects.all()
    serializer_class = PaymentTransactionSerializer
    permission_classes = [AdminWriteOnly]
