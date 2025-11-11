from rest_framework.routers import DefaultRouter
from ..views.system_model_view_sets import FlaggedContentViewSet, AnnouncementViewSet, LogEntryViewSet

router = DefaultRouter()
router.register(r'flagged-contents', FlaggedContentViewSet, basename='flagged-content')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'log-entries', LogEntryViewSet, basename='log-entry')

urlpatterns = router.urls