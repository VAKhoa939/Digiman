from django.db import transaction
from ..models.user_models import User, Reader, Administrator
from ..services.image_service import ImageService, BucketNames
from rest_framework.request import Request
import uuid

from typing import Union

UserType = Union[User, Reader, Administrator]

class UserService:
    """
    Handles user-related business logic such as creating users based on role,
    uploading/deleting avatars, and handling Supabase image integration.
    """

    @staticmethod
    @transaction.atomic
    def create_user(data: dict, avatar_file=None) -> UserType:
        """
        Create a Reader or Administrator instance depending on role 
        (default: Reader).
        Optionally uploads avatar.
        """
        role = data.get("role") or User.RoleChoices.READER

        # Handle avatar upload
        avatar_url = None
        if avatar_file:
            avatar_url = ImageService.upload_image(avatar_file, BucketNames.USER_AVATARS)

        data = data.copy()
        if avatar_url:
            data["avatar"] = avatar_url

        # Role-based user creation
        if role == User.RoleChoices.READER:
            user = Reader.objects.create(**data)
        elif role == User.RoleChoices.ADMIN:
            # Set admin-specific fields, allowing full access
            data["is_superuser"] = True
            data["is_staff"] = True
            user = Administrator.objects.create(**data)
        else:
            raise ValueError(f"Invalid role: {role}")

        # Encrypt password
        user.update_password(data["password"])

        return user

    @staticmethod
    @transaction.atomic
    def update_user(user: UserType, data: dict, avatar_file=None) -> UserType:
        """
        Update a user instance, optionally replacing avatar (and deleting old one).
        """
        bucket = BucketNames.USER_AVATARS

        # Replace avatar if a new one is provided
        if avatar_file:
            # Upload new avatar
            new_avatar_url = ImageService.upload_image(avatar_file, bucket)

            # Delete old avatar if it exists
            if user.avatar:
                ImageService.delete_image(user.avatar, bucket)

            data["avatar"] = new_avatar_url

        # Encrypt password
        new_password = data.pop("password", None)
        if new_password:    
            user.update_password(new_password)

        # Update other fields
        user.update_metadata(**data)
        return user

    @staticmethod
    @transaction.atomic
    def delete_user(user: UserType) -> None:
        """
        Delete a user instance, optionally deleting their avatar.
        """
        if user.avatar:
            ImageService.delete_image(user.avatar, BucketNames.USER_AVATARS)

        user.delete()

    @staticmethod
    def get_user_model(role: str) -> UserType:
        if role == User.RoleChoices.READER:
            return Reader
        elif role == User.RoleChoices.ADMIN:
            return Administrator
        else:
            raise ValueError(f"Invalid role: {role}")

    @staticmethod
    def check_user_exists(
        username: str, email: str, role: str = User.RoleChoices.READER
    ) -> bool:
        UserModel = UserService.get_user_model(role)
        return (UserModel.objects.filter(username=username).exists() 
                or UserModel.objects.filter(email=email).exists())
    
    @staticmethod
    def authenticate_user(
        request: Request, identifier: str, password: str,
    ) -> UserType:
        from django.contrib.auth import authenticate

        # Try username first, then email
        user = authenticate(request, username=identifier, password=password)
        if user is None:
            try:
                user_obj = User.objects.filter(email=identifier).first()
                if user_obj:
                    user = authenticate(
                        request, username=user_obj.username, 
                        password=password)
            except Exception:
                pass
        return user