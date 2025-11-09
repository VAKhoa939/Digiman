from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # JWT endpoints
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # Model endpoints
    path("", include("api.urls.user_urls")),
    path("", include("api.urls.manga_urls")),
    path("", include("api.urls.reader_urls")),
    path("", include("api.urls.community_urls")),
    path("", include("api.urls.system_urls")),

    # Utility endpoints
    path("images/", include("api.urls.image_urls")),
]