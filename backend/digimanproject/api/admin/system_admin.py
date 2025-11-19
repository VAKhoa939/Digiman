from django.contrib import admin
from django.http import HttpRequest
from django import forms

from ..models.system_models import LogEntry
from .mixins import LogUserMixin


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = (
        'get_display_name', 'action_type', 'get_user_display_name', 
        'target_object_type', 'target_object_id', 'timestamp', 
        'is_moderated'
    )
    list_filter = ('action_type', 'target_object_type')
    ordering = ('-timestamp',)

    def get_display_name(self, obj: LogEntry) -> str:
        return str(obj)
    get_display_name.short_description = 'Display name'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
    