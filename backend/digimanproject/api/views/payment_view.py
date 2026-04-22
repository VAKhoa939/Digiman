from typing import Dict, Optional

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

from ..serializers.payment_serializers import CreateCheckoutSessionSerializer
from ..models.user_models import Reader
from ..models.subscription_models import SubscriptionPlan, PaymentProviderChoices
from ..utils.stripe_client import stripe
from ..utils.env_getters import env


class CreateCheckoutSession(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request: Request) -> Response:
        """Create a Stripe Checkout Session and return the redirect URL.

        Expects request JSON body: 
        { 
            "planId": "xxx",
            "provider: "yyy"
        }
        """
        reader: Optional[Reader] = request.user
        if not reader:
            return Response({"detail": "Invalid user."}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = CreateCheckoutSessionSerializer(data=request.data)
        if not serializer.is_valid():
            # Extract the first error message
            first_error_key = next(iter(serializer.errors))
            first_error_message = serializer.errors[first_error_key][0]
            return Response({'detail': first_error_message}, status=status.HTTP_400_BAD_REQUEST)
        
        plan_id = serializer.validated_data.get("planId")
        provider = serializer.validated_data.get("provider")
        subscription_plan = SubscriptionPlan.objects.get(id=plan_id)

        if provider == PaymentProviderChoices.STRIPE:
            customer_email = reader.get_email()
            frontend_url = env("FRONTEND_URL")
            price_id = subscription_plan.get_stripe_price_id()
            metadata: Dict[str, str] = {"reader_id": str(reader.get_id()), "plan_id": plan_id}
            return stripe_create_checkout_session(customer_email, price_id, metadata, frontend_url)
        else:
            return Response({"detail": "Invalid provider."}, status=status.HTTP_400_BAD_REQUEST)
    
    
def stripe_create_checkout_session(
    customer_email: str, price_id: str, metadata: Dict[str, str], frontend_url: str
) -> Response:
    try:
        session = stripe.checkout.Session.create(
            customer_email=customer_email,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            metadata=metadata,
            success_url=f"{frontend_url}/subscription/success",
            cancel_url=f"{frontend_url}/subscription/cancel",
        )
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({"url": session.url, "id": session.id})
