from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response

from ..models.user_models import User, Reader, Administrator
from ..serializers.user_model_serializers import (
    UserSerializer, ReaderSerializer, AdministratorSerializer
)
from ..services.user_service import UserService

from typing import Union

UserSerializerType = Union[UserSerializer, ReaderSerializer, AdministratorSerializer]

# ------------------- Base ViewSet ------------------- #

class BaseUserViewSet(viewsets.ModelViewSet):
    """
    Base class for user-related ViewSets using UserService for business logic.
    Subclasses define their queryset and serializer_class.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Returns the queryset based on the user's role.
        For Admins, returns all users. 
        For other users, returns only their own user.
        """
        user = self.request.user
        if not isinstance(user, User):
            return User.objects.none()
        if user.role == User.RoleChoices.ADMIN:
            return Reader.objects.all()
        UserModel = UserService.get_user_model(user.role)
        return UserModel.objects.filter(pk=user.pk)


    def perform_create(self, serializer: UserSerializerType):
        # Get uploaded avatar file (if provided)
        request = self.request
        avatar_file = request.FILES.get("avatar_upload")
        if isinstance(avatar_file, list):
            avatar_file = avatar_file[0]

        # Add the action user to the validated data
        data = serializer.validated_data
        data["_action_user"] = request.user

        # Call service to handle creation logic
        user = UserService.create_user(serializer.validated_data, avatar_file)
        serializer.instance = user  # attach instance for response

    def perform_update(self, serializer: UserSerializerType):
        # Get uploaded avatar file (if provided)
        request = self.request
        avatar_file = request.FILES.get("avatar_upload")

        # Add the action user to the object
        user = serializer.instance
        user._action_user = request.user

        # Call service to handle creation logic
        updated_user = UserService.update_user(user, serializer.validated_data, avatar_file)
        serializer.instance = updated_user  # attach instance for response
        
    def perform_destroy(self, instance):
        raise PermissionDenied("Deleting users is not allowed.")

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        """Custom destroy method to clear refresh token cookie on self-delete.
        
        Request data:
        - headers: "Content-Type: application/json",
        "Accept: application/json",
        "Origin: ... (frontend url)",
        "Referer: .../ (frontend url)",
        "Authorization: Bearer ... (access token)"
        - Cookie: "refresh_token=..."
        
        Response data:
        - body: "detail"
        """
        instance = self.get_object()
        is_self_deletion = request.user.pk == instance.pk

        # Let DRF delete the user
        self.perform_destroy(instance)

        # Build response
        response = Response(
            {"detail": "User deleted."}, status=status.HTTP_204_NO_CONTENT)

        # If self-delete, clear refresh cookie
        if is_self_deletion:
            response.delete_cookie("refresh_token")

        return response


# ------------------- Specific ViewSets ------------------- #

class UserViewSet(BaseUserViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class ReaderViewSet(BaseUserViewSet):
    queryset = Reader.objects.all()
    serializer_class = ReaderSerializer


class AdministratorViewSet(BaseUserViewSet):
    queryset = Administrator.objects.all()
    serializer_class = AdministratorSerializer
    permission_classes = [*BaseUserViewSet.permission_classes, IsAdminUser]
