from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..models.system_models import FlaggedContent, Announcement, LogEntry
from ..serializers.system_model_serializers import FlaggedContentSerializer, AnnouncementSerializer, LogEntrySerializer


class FlaggedContentViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]
    queryset = FlaggedContent.objects.all()
    serializer_class = FlaggedContentSerializer

    def get_queryset(self):
        return FlaggedContent.objects.filter(is_resolved=False)


class AnnouncementViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

    

class LogEntryViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
