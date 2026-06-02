from typing import Dict, Optional

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

from ..serializers.payment_serializers import CreateCheckoutSessionSerializer
from ..models.user_models import User
from ..models.subscription_models import SubscriptionPlan, ReaderSubscription, PaymentProviderChoices
from ..services.stripe_service import StripeService
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
        user = request.user
        if not user or not isinstance(user, User):
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
        frontend_url = env("FRONTEND_URL")

        # reset the subscription to default (free) plan
        subscription = ReaderSubscription.objects.get(reader_id=user.id)
        subscription.start_purchase()

        if provider == PaymentProviderChoices.STRIPE:
            customer_email = user.get_email()
            price_id = subscription_plan.get_stripe_price_id()
            metadata: Dict[str, str] = {"reader_id": str(user.get_id()), "plan_id": plan_id}
            try:
                data = StripeService.create_checkout_session(customer_email, price_id, metadata, frontend_url)
                return Response(data, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({"detail": "Invalid provider."}, status=status.HTTP_400_BAD_REQUEST)


class CreateStripeCustomerPortalSession(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request: Request) -> Response:
        """Create a Stripe Customer Portal Session and return the redirect URL.

        Expects request JSON body: 
        { 
            "url": "xxx"
        }
        """
        user = request.user
        if not user or not isinstance(user, User):
            return Response({"detail": "Invalid user."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            session_url = StripeService.create_customer_portal_session(user.get_id())
            return Response({"url": session_url}, status=status.HTTP_200_OK)
        except Exception as e:
            print('\nError creating Stripe customer portal session\n')
            print(e)
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)