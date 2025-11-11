from rest_framework.routers import DefaultRouter
from ..views.manga_model_view_sets import MangaTitleViewSet, ChapterViewSet, PageViewSet, GenreViewSet, AuthorViewSet

router = DefaultRouter()
router.register(r'manga-titles', MangaTitleViewSet, basename='manga-title')
router.register(r'chapters', ChapterViewSet, basename='chapter')
router.register(r'pages', PageViewSet, basename='page')
router.register(r'genres', GenreViewSet, basename='genre')
router.register(r'authors', AuthorViewSet, basename='author')

urlpatterns = router.urls