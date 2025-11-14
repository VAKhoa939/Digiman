from rest_framework.permissions import BasePermission, SAFE_METHODS
from ..models.user_models import User

class AdminWriteOnly(BasePermission):
    """
    Read: everyone allowed
    Write: only users where user.role == ADMIN
    """
    def has_permission(self, request, view):
        # Safe methods = GET, HEAD, OPTIONS -> always allowed
        if request.method in SAFE_METHODS:
            return True

        # If not authenticated -> cannot write
        if not request.user or not request.user.is_authenticated:
            return False

        # Only allow write if user is an Admin
        return request.user.role == User.RoleChoices.ADMIN