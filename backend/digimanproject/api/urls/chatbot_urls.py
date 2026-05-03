from django.urls import path
from ..views.chatbot_view import ChatView

urlpatterns = [
    path("chat/", ChatView.as_view(), name="chatbot-chat"),
]
