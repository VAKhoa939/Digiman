from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..models.system_models import Report, Penalty, FlaggedContent, LogEntry
from ..serializers.system_model_serializers import ReportSerializer, PenaltySerializer, FlaggedContentSerializer, LogEntrySerializer


class ReportViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]
    queryset = Report.objects.all()
    serializer_class = ReportSerializer


class PenaltyViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]
    queryset = Penalty.objects.all()
    serializer_class = PenaltySerializer


class FlaggedContentViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]
    queryset = FlaggedContent.objects.all()
    serializer_class = FlaggedContentSerializer

    def get_queryset(self):
        return FlaggedContent.objects.filter(is_resolved=False)
    

class LogEntryViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
