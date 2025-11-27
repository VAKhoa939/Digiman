from rest_framework import serializers
from ..models.user_models import User, Reader, Administrator

class UserSerializer(serializers.ModelSerializer):
    """Fields for user: id, username, email, role, status, created_at"""
    password = serializers.CharField(
        write_only=True,
        required=False,
        style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "password",
            "role", "status", "created_at",
        ]
        read_only_fields = [
            field for field in fields if field not in {
                "username", "email", "password",
            }
        ]


class ReaderSerializer(UserSerializer):
    """Fields for reader: id, username, email, role, status, created_at,
    display_name, age, avatar"""

    class Meta:
        model = Reader
        fields = UserSerializer.Meta.fields + [
            "display_name", "age", "avatar",
        ]
        read_only_fields = UserSerializer.Meta.read_only_fields


class AdministratorSerializer(ReaderSerializer):
    """Fields for reader: id, username, email, role, status, created_at,
    display_name, age, avatar, avatar_upload"""
    class Meta:
        model = Administrator
        fields = ReaderSerializer.Meta.fields
        read_only_fields = ReaderSerializer.Meta.read_only_fields
