from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..models.system_models import Report, Penalty, FlaggedContent, LogEntry
from ..serializers.system_model_serializers import ReportSerializer, PenaltySerializer, FlaggedContentSerializer, LogEntrySerializer


class ReportViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and user.is_staff:
            return Report.objects.all()
        # Authenticated readers see only their own reports
        return Report.objects.filter(reporter=user)

    def perform_create(self, serializer):
        target_content_type = serializer.validated_data.get("target_content_type")
        target_content_id = serializer.validated_data.get("target_content_id")

        # Duplicate prevention: block same user reporting same content with a pending report
        duplicate = Report.objects.filter(
            reporter=self.request.user,
            target_content_type=target_content_type,
            target_content_id=target_content_id,
            status=Report.StatusChoices.PENDING,
        ).exists()
        if duplicate:
            raise ValidationError(
                "You have already submitted a pending report for this content."
            )

        serializer.save(reporter=self.request.user)


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
