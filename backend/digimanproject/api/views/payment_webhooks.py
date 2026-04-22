import json
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt

from ..utils.env_getters import env
from ..utils.stripe_client import stripe
from ..models.user_models import Reader

@api_view(["POST"])
@csrf_exempt
def stripe_webhook(request: Request) -> Response:
    payload = request.body
    sig_header: str = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    webhook_secret: str = env("STRIPE_WEBHOOK_SECRET", default="")

    if webhook_secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except ValueError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
    else:
        # If no webhook secret provided, parse without verification (only for local testing).
        try:
            event = json.loads(payload)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

    # Handle relevant events
    event_type: str = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)

    if event_type == "checkout.session.completed":
        obj = event["data"]["object"] if isinstance(event, dict) else event.data.object
        customer_email = obj.get("customer_email")
        subscription_id = obj.get("subscription")
        # Link to existing reader account if possible (no DB schema changes here)
        try:
            reader = Reader.objects.filter(email=customer_email).first()
            if reader:
                # In a future change: persist stripe_customer_id/stripe_subscription_id on user
                pass
        except Exception:
            pass

    # Additional events (invoice.payment_failed, customer.subscription.updated etc.)

    return Response(status=status.HTTP_200_OK)

