from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from ..services.chatbot_service import ChatbotService


class ChatView(APIView):
    """
    POST /api/chatbot/chat/

    Request body:
        {
            "message": "<user message>",
            "history": [
                {"role": "user",   "content": "..."},
                {"role": "bot",    "content": "..."}
            ]
        }

    Response:
        {
            "intent": "navigation|guide|recommendation",
            "answer": "<DigiBot response>"
        }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        history = request.data.get("history") or []

        if not message:
            return Response(
                {"detail": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(history, list):
            history = []

        result = ChatbotService.chat(message, history)
        return Response(result, status=status.HTTP_200_OK)
