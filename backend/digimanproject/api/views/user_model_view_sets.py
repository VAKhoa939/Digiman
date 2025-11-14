from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

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

    def perform_create(self, serializer: UserSerializerType):
        # Get uploaded avatar file (if provided)
        request = self.request
        avatar_file = request.FILES.get("avatar_upload")

        # Call service to handle creation logic
        user = UserService.create_user(serializer.validated_data, avatar_file)
        serializer.instance = user  # attach instance for response

    def perform_update(self, serializer: UserSerializerType):
        request = self.request
        avatar_file = request.FILES.get("avatar") or request.FILES.get("avatar_upload")

        user = serializer.instance
        updated_user = UserService.update_user(user, serializer.validated_data, avatar_file)
        serializer.instance = updated_user
        
    def perform_destroy(self, instance):
        # Delegate delete logic to service
        UserService.delete_user(instance)


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
