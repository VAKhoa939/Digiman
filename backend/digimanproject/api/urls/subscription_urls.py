from rest_framework.routers import DefaultRouter
from django.urls import path
from ..views.subscription_view import SubscriptionPlanViewSet, ReaderSubscriptionViewSet, PaymentTransactionViewSet, SubscriptionMeView

router = DefaultRouter()
router.register(r'plans', SubscriptionPlanViewSet, basename='plan')
router.register(r'reader-subscriptions', ReaderSubscriptionViewSet, basename='reader-subscription')
router.register(r'transactions', PaymentTransactionViewSet, basename='transaction')

urlpatterns = router.urls
urlpatterns.extend([
    path("me/", SubscriptionMeView.as_view(), name="me"),
])