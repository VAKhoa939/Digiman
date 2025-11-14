from django.urls import path
from ..views.authentication_views import RegisterView, LoginView, CookieTokenRefreshView, LogoutView, CurrentUserView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("refresh/", CookieTokenRefreshView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("me/", CurrentUserView.as_view()),
]