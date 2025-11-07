from rest_framework import serializers
from ..models.user_models import User, Reader, Administrator

class UserSerializer(serializers.ModelSerializer):
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
        read_only_fields = ["id", "created_at"]


class ReaderSerializer(UserSerializer):
    avatar_upload = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = Reader
        fields = UserSerializer.Meta.fields + [
            "display_name", "avatar", "age", "avatar_upload",
        ]
        read_only_fields = UserSerializer.Meta.read_only_fields + ["role"]


class AdministratorSerializer(ReaderSerializer):
    class Meta:
        model = Administrator
        fields = ReaderSerializer.Meta.fields
        read_only_fields = ReaderSerializer.Meta.read_only_fields
