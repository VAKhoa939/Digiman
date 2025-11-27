from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from ..models.community_models import Comment, Report, Notification, Penalty
from ..serializers.community_model_serializers import CommentSerializer, ReportSerializer, NotificationSerializer, PenaltySerializer
from ..services.community_service import CommunityService
from ..filters.community_filters import CommentFilter


class CommentViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = CommentFilter
    ordering_fields = ["created_at"]
    ordering = ["created_at"]
    
    def perform_create(self, serializer: CommentSerializer):
        request = self.request
        attached_image_file = request.FILES.get("attached_image_upload")
        if isinstance(attached_image_file, list):
            attached_image_file = attached_image_file[0]

        # Add the action user to the validated data
        data = serializer.validated_data
        data["_action_user"] = request.user

        comment = CommunityService.create_comment(
            data, request.user, attached_image_file
        )
        serializer.instance = comment

    def perform_update(self, serializer: CommentSerializer):
        request = self.request

        attached_image_file = request.FILES.get("attached_image_upload")
        if isinstance(attached_image_file, list):
            attached_image_file = attached_image_file[0]

        # Add the action user to the object
        comment: Comment = serializer.instance
        comment._action_user = request.user

        updated_comment = CommunityService.update_comment(
            comment, serializer.validated_data, attached_image_file
        )
        serializer.instance = updated_comment

    def perform_destroy(self, instance: Comment):
        # Not allowed
        raise PermissionDenied("Deleting comments is not allowed.")


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
