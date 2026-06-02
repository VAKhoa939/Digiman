from rest_framework import serializers
from ..models.user_models import User, Reader, Administrator

class UserSerializer(serializers.ModelSerializer):
    """Fields for user: id, username, email, role, status, created_at, password, 
    moderation_status, last_moderated_at"""
    password = serializers.CharField(
        write_only=True,
        required=False,
        style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = [
            "id", 
            "username", 
            "email", 
            "role", 
            "status", 
            "created_at",
            "password",
            "moderation_status",
            "last_moderated_at",
        ]


class ReaderSerializer(UserSerializer):
    """Fields for reader: id, username, email, role, status, created_at, password, 
    moderation_status, last_moderated_at, display_name, avatar"""

    class Meta:
        model = Reader
        fields = UserSerializer.Meta.fields + [
            "display_name", "avatar",
        ]


class AdministratorSerializer(ReaderSerializer):
    """Fields for administrator: id, username, email, role, status, created_at, password, 
    moderation_status, last_moderated_at, display_name, avatar, avatar_upload"""
    class Meta:
        model = Administrator
        fields = ReaderSerializer.Meta.fields
