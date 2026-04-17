from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

from ..models.user_models import Reader
from ..models.subscription_models import SubscriptionPlan
from ..utils.stripe_client import stripe
from ..utils.env_getters import env


class CreateCheckoutSession(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request: Request) -> Response:
        """Create a Stripe Checkout Session and return the redirect URL.

        Expects request JSON body: 
        { 
            "subscriptionPlanId": "xxx",
            "provider: "yyy"
        }
        """
        user: Reader = request.user
        if not user:
            return Response({"detail": "Invalid user."}, status=status.HTTP_400_BAD_REQUEST)
        
        subscription_plan_id = request.data.get("subscriptionPlanId")
        if not subscription_plan_id:
            return Response({"detail": "Missing subscriptionPlanId."}, status=status.HTTP_400_BAD_REQUEST)
        
        subscription_plan = SubscriptionPlan.objects.filter(id=subscription_plan_id).first()
        if not subscription_plan:
            return Response({"detail": "Invalid subscriptionPlanId."}, status=status.HTTP_400_BAD_REQUEST)

        provider = request.data.get("provider")
        if not provider:
            return Response({"detail": "Missing provider."}, status=status.HTTP_400_BAD_REQUEST)
        
        if provider.lower() == "stripe":
            frontend_url = env("FRONTEND_URL")
            price_id = subscription_plan.get_stripe_price_id()
            return stripe_create_checkout_session(user, price_id, frontend_url)
        else:
            return Response({"detail": "Invalid provider."}, status=status.HTTP_400_BAD_REQUEST)
    
    
def stripe_create_checkout_session(user: Reader, price_id: str, frontend_url: str) -> Response:
    try:
        session = stripe.checkout.Session.create(
            customer_email=user.email,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{frontend_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/subscription/cancel",
        )
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({"url": session.url, "id": session.id})
