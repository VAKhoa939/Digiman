import json
from pprint import pprint
from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt

from ..utils.env_getters import env
from ..utils.stripe_client import stripe

from ..services.stripe_service import StripeService

class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @csrf_exempt
    def post(self, request: Request) -> Response:
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
        event_type = event["type"]
        obj = event["data"]["object"]

        match event_type:
            case "checkout.session.completed":
                StripeService.handle_checkout_session_completed_event(obj)
            case "invoice.paid":
                StripeService.handle_invoice_paid_event(obj)
            case _:
                pass
        # Additional events (invoice.payment_failed, customer.subscription.updated etc.)

        return Response(status=status.HTTP_200_OK)

