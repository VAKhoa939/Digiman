from rest_framework.routers import DefaultRouter
from ..views.reader_model_view_sets import ReaderPreferencesViewSet, LibraryListViewSet, ReadingProgressViewSet, MangaReaderStatisticsViewSet

router = DefaultRouter()
router.register(r'reader-preferences', ReaderPreferencesViewSet, basename='reader-preferences')
router.register(r'library-lists', LibraryListViewSet, basename='library-list')
router.register(r'reading-progress', ReadingProgressViewSet, basename='reading-progress')
router.register(r'manga-reader-statistics', MangaReaderStatisticsViewSet, basename='manga-reader-statistics')

urlpatterns = router.urls