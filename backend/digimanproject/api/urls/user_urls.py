from rest_framework.routers import DefaultRouter
from ..views.user_model_view_sets import UserViewSet, ReaderViewSet, AdministratorViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'readers', ReaderViewSet, basename='reader')
router.register(r'administrators', AdministratorViewSet, basename='administrator')

urlpatterns = router.urls