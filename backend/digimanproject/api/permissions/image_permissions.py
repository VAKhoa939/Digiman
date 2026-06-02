from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import View

from ..models.user_models import User
from ..services.image_service import BucketNames


class CanManageImage(BasePermission):
    """
    Enforces bucket-based permissions for uploading or deleting images.
    - Authenticated users can upload/delete in user-avatars or comment-images.
    - Only admins can manage manga-content images.
    """
    def has_permission(self, request: Request, view: View) -> bool:
        user = request.user
        if not user or not isinstance(user, User) or not user.is_authenticated:
            return False

        bucket = request.data.get("bucket") or request.query_params.get("bucket")

        if bucket not in BucketNames.values():
            return False

        # Only admins can manage manga-content
        if bucket == "manga-content" and not user.has_admin_access():
            return False

        return True
