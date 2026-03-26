from django.urls import path
from ..views import payments

urlpatterns = [
    path("create-checkout-session", payments.CreateCheckoutSession.as_view(), name="create-checkout-session"),
    path("webhook", payments.stripe_webhook, name="stripe-webhook"),
]
