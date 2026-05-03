from django.urls import path, include


urlpatterns = [
    # Model endpoints
    path("", include("api.urls.user_urls")),
    path("", include("api.urls.manga_urls")),
    path("", include("api.urls.reader_urls")),
    path("", include("api.urls.system_urls")),

    # Utility endpoints
    path("auth/", include("api.urls.authentication_urls")),
    path("images/", include("api.urls.image_urls")),
    path("subscriptions/", include("api.urls.subscription_urls")),
    path("payments/", include("api.urls.payment_urls")),
    path("chatbot/", include("api.urls.chatbot_urls")),
]