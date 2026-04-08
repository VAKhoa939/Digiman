import json
import os
import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework import status

from ..models.user_models import User


stripe.api_key = os.getenv("STRIPE_SECRET_KEY", getattr(settings, "STRIPE_SECRET_KEY", None))


class CreateCheckoutSession(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        """Create a Stripe Checkout Session and return the redirect URL.

        Expects JSON body: { "priceId": "price_xxx" }
        """
        price_id = request.data.get("priceId")
        if not price_id:
            return Response({"detail": "Missing priceId."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")

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


@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", getattr(settings, "STRIPE_WEBHOOK_SECRET", None))

    if webhook_secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except ValueError:
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError:
            return HttpResponse(status=400)
    else:
        # If no webhook secret provided, parse without verification (only for local testing).
        try:
            event = json.loads(payload)
        except Exception:
            return HttpResponse(status=400)

    # Handle relevant events
    etype = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)

    if etype == "checkout.session.completed":
        obj = event["data"]["object"] if isinstance(event, dict) else event.data.object
        customer_email = obj.get("customer_email")
        subscription_id = obj.get("subscription")
        # Link to existing user if possible (no DB schema changes here)
        try:
            user = User.objects.filter(email=customer_email).first()
            if user:
                # In a future change: persist stripe_customer_id/stripe_subscription_id on user
                pass
        except Exception:
            pass

    # Additional events (invoice.payment_failed, customer.subscription.updated etc.)

    return HttpResponse(status=200)
