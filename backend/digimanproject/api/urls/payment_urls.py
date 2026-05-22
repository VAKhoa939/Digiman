from django.urls import path
from ..views.payment_view import CreateCheckoutSession, CreateStripeCustomerPortalSession
from ..views.webhook_view import StripeWebhookView

urlpatterns = [
    path("create-checkout-session", CreateCheckoutSession.as_view(), name="create-checkout-session"),
    path("stripe-webhook", StripeWebhookView.as_view(), name="stripe-webhook"),
    path("create-customer-portal-session", CreateStripeCustomerPortalSession.as_view(), name="create-customer-portal-session"),
]
