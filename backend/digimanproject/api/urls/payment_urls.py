from django.urls import path
from ..views.payment_view import CreateCheckoutSession
from ..views.payment_webhooks import stripe_webhook

urlpatterns = [
    path("create-checkout-session", CreateCheckoutSession.as_view(), name="create-checkout-session"),
    path("stripe-webhook", stripe_webhook, name="stripe-webhook"),
]
