from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.request import Request
from rest_framework.views import View

from ..models.user_models import User

class AdminWriteOnly(BasePermission):
    """
    Read: everyone allowed (including visitors)
    Write: only authenticated users where their role are Admins
    """
    def has_permission(self, request: Request, view: View) -> bool:
        # Safe (Read) methods = GET, HEAD, OPTIONS -> always allowed
        if request.method in SAFE_METHODS:
            return True

        # Write methods = POST, PUT, PATCH, DELETE -> only authenticated admins
        user = request.user
        if not user or not isinstance(user, User) or not user.is_authenticated:
            return False
        return user.has_admin_access()