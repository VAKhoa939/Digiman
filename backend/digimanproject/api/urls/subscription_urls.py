from rest_framework.routers import DefaultRouter
from ..views.subscription_model_view_sets import SubscriptionPlanViewSet, ReaderSubscriptionViewSet, PaymentTransactionViewSet

router = DefaultRouter()
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'reader-subscriptions', ReaderSubscriptionViewSet, basename='reader-subscription')
router.register(r'payment-transactions', PaymentTransactionViewSet, basename='payment-transaction')

urlpatterns = router.urls