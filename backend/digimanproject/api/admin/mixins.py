from django import forms
from django.http import HttpRequest


class LogUserMixin:
    """Mixin to attach the current user to the object for logging."""
    def save_model(self, request: HttpRequest, obj, form: forms.ModelForm, change: bool):
        obj._action_user = request.user
        super().save_model(request, obj, form, change)

    def delete_model(self, request: HttpRequest, obj):
        obj._action_user = request.user
        super().delete_model(request, obj)