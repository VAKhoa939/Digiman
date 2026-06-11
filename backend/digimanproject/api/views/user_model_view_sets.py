from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import PermissionDenied

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
        if not user or not isinstance(user, User):
            return User.objects.none()
        
        # If the user is an admin, return all users
        if user.has_admin_access():
            return Reader.objects.all()
        
        # Else, return only their own user
        UserModel = UserService.get_user_model(user.get_role())
        return UserModel.objects.get(pk=user.pk)

    def perform_create(self, serializer: UserSerializerType):
        # Get uploaded avatar file (if provided)
        request = self.request
        avatar_file = request.FILES.get("avatar_upload")
        if isinstance(avatar_file, list):
            avatar_file = avatar_file[0]

        # Call service to handle creation logic
        user = UserService.create_user(serializer.validated_data, avatar_file)
        serializer.instance = user  # attach instance for response

    def perform_update(self, serializer: UserSerializerType):
        # Get uploaded avatar file (if provided)
        request = self.request
        avatar_file = request.FILES.get("avatar_upload")

        # Add the action user to the object
        user = serializer.instance

        # Call service to handle creation logic
        updated_user = UserService.update_user(user, serializer.validated_data, avatar_file)
        serializer.instance = updated_user  # attach instance for response
        
    def perform_destroy(self, instance):
        raise PermissionDenied("Deleting users is not allowed.")
    

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
