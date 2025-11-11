from django.contrib import admin
from ..models.user_models import User

class BasePermissionAdmin(admin.ModelAdmin):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        else:
            return request.user.role == User.RoleChoices.ADMIN

    def has_add_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        else:
            return request.user.role == User.RoleChoices.ADMIN

    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        else:
            return request.user.role == User.RoleChoices.ADMIN

    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        else:
            return request.user.role == User.RoleChoices.ADMIN