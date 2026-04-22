from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

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

class SubscriptionMeView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request: Request) -> Response:
        from ..models.user_models import Reader

        reader = request.user
        if not reader or not isinstance(reader, Reader):
            return Response({"detail": "Invalid user."}, status=status.HTTP_400_BAD_REQUEST)

        subscription = ReaderSubscription.objects.filter(reader=reader).first()
        if not subscription:
            # Every user has a ReaderSubscription object.
            return Response({"detail": "Invalid user."}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(
            ReaderSubscriptionSerializer(subscription).data, 
            status=status.HTTP_200_OK
        )
