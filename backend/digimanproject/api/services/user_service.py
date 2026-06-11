from django.db import transaction
from rest_framework.request import Request

from ..models.user_models import User, Reader, Administrator, RoleChoices
from ..models.common_choice_classes import ModerationStatusChoices
from ..services.image_service import ImageService, BucketNames
from .system_service import LogEntryService
from ..tasks import enqueue_moderation_task

from typing import Union

UserType = Union[User, Reader, Administrator]

class UserService:
    """
    Handles user-related business logic such as creating users based on role,
    uploading/deleting avatars, and handling Supabase image integration.
    """

    @staticmethod
    def create_user(data: dict, avatar_file=None) -> UserType:
        """
        Create a Reader or Administrator instance depending on role 
        (default: Reader).
        Optionally uploads avatar.
        """
        role = data.get("role") or RoleChoices.READER

        # Handle avatar upload
        avatar_url = None
        if avatar_file:
            avatar_url = ImageService.upload_image(avatar_file, BucketNames.USER_AVATARS)

        data = data.copy()
        if avatar_url:
            data["avatar"] = avatar_url

        # Add moderation status to data
        data["moderation_status"] = ModerationStatusChoices.PENDING

        # Create user and log entry in a single transaction
        with transaction.atomic():
            # Role-based user creation
            if role == RoleChoices.READER:
                user = Reader.objects.create(**data)
            elif role == RoleChoices.ADMIN:
                # Set admin-specific fields, allowing full access
                data["is_superuser"] = True
                data["is_staff"] = True
                user = Administrator.objects.create(**data)
            else:
                raise ValueError(f"Invalid role: {role}")

            # Encrypt password
            user.update_password(data["password"])

            entry = LogEntryService.log_object_save(user, True)

            # Run moderation pipeline after transaction
            transaction.on_commit(lambda: enqueue_moderation_task(entry.id))

        return user

    @staticmethod
    def update_user(user: UserType, data: dict, avatar_file=None) -> UserType:
        """
        Update a user instance, optionally replacing avatar (and deleting old one).
        """
        status = data.get("status")
        if status and status == User.StatusChoices.DELETED:
            user.set_deleted()
            LogEntryService.resolve_old_entries_and_flags(user.get_role(), user.get_id(), ["username", "display_name", "avatar"])
            LogEntryService.log_object_save(user, False)
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

        # Update other user fields and create log entry in a single transaction
        with transaction.atomic():
            updated = user.update_metadata(**data)
            print("is updated: ", updated)
            if not updated:
                return user   # Nothing to update

            if getattr(user, "_action_user", None) is None:
                user._action_user = user
            entry = LogEntryService.log_object_save(user, False)

            # Run moderation pipeline after transaction
            transaction.on_commit(lambda: enqueue_moderation_task(entry.id))
        return user

    @staticmethod
    @transaction.atomic
    def delete_user(user: UserType) -> None:
        """
        Delete a user instance, optionally deleting their avatar.

        Action user must be an admin.
        """
        if (getattr(user, "_action_user", None) is None 
            or not User.objects.filter(pk=user._action_user.pk).exists()):
            raise ValueError("Action user not found")
        action_user = User.objects.get(pk=user._action_user.pk)
        if not action_user.has_admin_access():
            raise ValueError("Action user does not have admin access")
        
        # Delete avatar if it exists
        if user.avatar:
            ImageService.delete_image(user.avatar, BucketNames.USER_AVATARS)
        
        # Delete user and log deletion
        user.delete()
        LogEntryService.log_object_delete(user)

    @staticmethod
    def get_user_model(role: str) -> UserType:
        if role == RoleChoices.READER:
            return Reader
        elif role == RoleChoices.ADMIN:
            return Administrator
        else:
            raise ValueError(f"Invalid role: {role}")

    @staticmethod
    def check_user_exists(
        username: str, email: str, role: str = RoleChoices.READER
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