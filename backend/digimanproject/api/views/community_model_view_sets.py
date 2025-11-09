from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..models.community_models import Comment, Report, Notification, Penalty
from ..serializers.community_model_serializers import CommentSerializer, ReportSerializer, NotificationSerializer, PenaltySerializer


class CommentViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer


class ReportViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]
    queryset = Report.objects.all()
    serializer_class = ReportSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class PenaltyViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]
    queryset = Penalty.objects.all()
    serializer_class = PenaltySerializer
