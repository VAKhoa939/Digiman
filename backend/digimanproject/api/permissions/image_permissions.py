from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from ..models.user_models import User


class CanManageImage(BasePermission):
    """
    Enforces bucket-based permissions for uploading or deleting images.
    - Authenticated users can upload/delete in user-avatars or comment-images.
    - Only admins can manage manga-content images.
    """

    def has_permission(self, request: Request, view) -> bool:
        if not request.user.is_authenticated:
            return False

        bucket = request.data.get("bucket") or request.query_params.get("bucket")

        if bucket not in ["user-avatars", "comment-images", "manga-content"]:
            return False

        if bucket == "manga-content" and request.user.role != User.RoleChoices.ADMIN:
            return False

        return True
