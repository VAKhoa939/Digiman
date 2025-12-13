from django.contrib import admin
from django.http import HttpRequest, JsonResponse
from django import forms
from django.urls import path
from django.shortcuts import redirect
from django.contrib import messages
from django.core.cache import cache

from ..models.system_models import LogEntry, FlaggedContent
from ..services.system_service import SystemService
from ..tasks import run_moderation_pipeline_task


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = (
        "get_display_name", "action_type", "get_user_display_name", 
        "target_object_type", "target_object_id", "timestamp", 
        "is_moderated"
    )
    list_filter = ("action_type", "target_object_type")
    ordering = ("-timestamp",)

    def get_display_name(self, obj: LogEntry) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(FlaggedContent)
class FlaggedContentAdmin(admin.ModelAdmin):
    list_display = (
        "get_display_name", "target_object_type", "content_name", 
        "dominant_attribute", "severity_score", "flagged_at"
    )
    ordering = ("-flagged_at",)

    fields = (
        "dominant_attribute", "severity_score", "reason", "details", 
        "flagged_at", "is_content_image", "content_name", "content", 
        "target_object_type", "target_object_id",
    )

    readonly_fields = (*fields,)

    change_list_template = "admin/flagged_content_changelist.html"
    change_form_template = "admin/flagged_content_change_form.html"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(is_resolved=False)
    
    def get_display_name(self, obj: FlaggedContent) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "run-moderation/", 
                self.admin_site.admin_view(self.run_moderation), 
                name="run_moderation"
            ),
            path(
                "moderation-status/", 
                self.admin_site.admin_view(self.moderation_status), 
                name="moderation_status"
            ),
        ]
        return custom_urls + urls

    def run_moderation(self, request: HttpRequest):
        """
        Runs the moderation pipeline.
        Sets a cache entry to prevent multiple runs.
        """
        if cache.get("moderation:running"):
            messages.warning(request, "Moderation pipeline is already running.")
            return redirect("admin:api_flaggedcontent_changelist")
        run_moderation_pipeline_task.delay()

        messages.success(
            request,
            "Moderation pipeline started. This may take a few seconds. "
            "You can continue using the admin normally.",
        )
        return redirect("admin:api_flaggedcontent_changelist")
    
    def moderation_status(self, request):
        return JsonResponse({
            "running": bool(cache.get("moderation:running")),
            "completed": bool(cache.get("moderation:completed")),
        })

    def changelist_view(self, request: HttpRequest, extra_context=None):
        # Check if Celery task finished
        if cache.get("moderation:completed"):
            messages.success(request, "Moderation pipeline completed successfully.")
            cache.delete("moderation:completed")

        return super().changelist_view(request, extra_context)

    def response_change(self, request, obj):
        if "_resolve_flag" in request.POST:
            if isinstance(obj, FlaggedContent):
                obj.resolve()

                self.message_user(
                    request,
                    "Flag resolved successfully.",
                    level=messages.SUCCESS,
                )
                SystemService.create_log_entry(None, LogEntry.ActionTypeChoices.RESOLVE_FLAG, obj)
            else:
                self.message_user(
                    request,
                    "Object is not a FlaggedContent.",
                    level=messages.ERROR,
                )

            return redirect("admin:api_flaggedcontent_changelist")

        return super().response_change(request, obj)

    def save_model(self, request, obj, form, change):
        if change:
            return  # block manual save
        super().save_model(request, obj, form, change)

    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return True
    
    def has_delete_permission(self, request, obj=None):
        return False