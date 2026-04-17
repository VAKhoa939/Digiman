from django.urls import path
from ..views import payment_view
from ..views.webhooks import stripe_webhook

urlpatterns = [
    path("create-checkout-session", payment_view.CreateCheckoutSession.as_view(), name="create-checkout-session"),
    path("stripe-webhook", stripe_webhook, name="stripe-webhook"),
]
