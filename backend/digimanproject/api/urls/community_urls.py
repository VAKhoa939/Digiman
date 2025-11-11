from rest_framework.routers import DefaultRouter
from ..views.community_model_view_sets import CommentViewSet, ReportViewSet, NotificationViewSet, PenaltyViewSet

router = DefaultRouter()
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'penalties', PenaltyViewSet, basename='penalty')

urlpatterns = router.urls