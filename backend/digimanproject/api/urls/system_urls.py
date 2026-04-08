from rest_framework.routers import DefaultRouter
from ..views.system_model_view_sets import ReportViewSet, PenaltyViewSet, FlaggedContentViewSet, LogEntryViewSet

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'penalties', PenaltyViewSet, basename='penalty')
router.register(r'flagged-contents', FlaggedContentViewSet, basename='flagged-content')
router.register(r'log-entries', LogEntryViewSet, basename='log-entry')

urlpatterns = router.urls