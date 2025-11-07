from django.db import transaction
from ..models.user_models import User, Reader, Administrator
from ..services.image_service import ImageService, BucketNames

from typing import Union

UserUnion = Union[User, Reader, Administrator]

class UserService:
    """
    Handles user-related business logic such as creating users based on role,
    uploading/deleting avatars, and handling Supabase image integration.
    """

    @staticmethod
    @transaction.atomic
    def create_user(data: dict, avatar_file=None) -> UserUnion:
        """
        Create a Reader or Administrator instance depending on role.
        Optionally uploads avatar.
        """
        role = data.get("role")
        image_service = ImageService()

        # Handle avatar upload
        avatar_url = None
        if avatar_file:
            avatar_url = image_service.upload_image(avatar_file, BucketNames.USER_AVATARS)

        data = data.copy()
        if avatar_url:
            data["avatar"] = avatar_url

        # Role-based user creation
        if role == User.RoleChoices.READER:
            user = Reader.objects.create(**data)
        elif role == User.RoleChoices.ADMIN:
            user = Administrator.objects.create(**data)
        else:
            raise ValueError(f"Invalid role: {role}")

        return user

    @staticmethod
    @transaction.atomic
    def update_user(user: UserUnion, data: dict, avatar_file=None) -> UserUnion:
        """
        Update a user instance, optionally replacing avatar (and deleting old one).
        """
        image_service = ImageService()
        bucket = BucketNames.USER_AVATARS

        # Replace avatar if a new one is provided
        if avatar_file:
            # Upload new avatar
            new_avatar_url = image_service.upload_image(avatar_file, bucket)

            # Delete old avatar if it exists
            if user.avatar:
                image_service.delete_image(user.avatar, bucket)

            data["avatar"] = new_avatar_url

        for field, value in data.items():
            setattr(user, field, value)

        user.save()
        return user

    @staticmethod
    @transaction.atomic
    def delete_user(user: UserUnion) -> None:
        """
        Delete a user instance, optionally deleting their avatar.
        """
        image_service = ImageService()
        bucket = BucketNames.USER_AVATARS

        if user.avatar:
            image_service.delete_image(user.avatar, bucket)

        user.delete()