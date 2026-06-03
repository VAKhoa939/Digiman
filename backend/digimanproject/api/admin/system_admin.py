from django.contrib import admin
from django.shortcuts import redirect
from django.contrib import messages

from ..models.system_models import Report, LogEntry, FlaggedContent, ModerationThreshold
from ..services.system_service import LogEntryService


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "reporter",
        "category",
        "target_content_type",
        "target_content_id",
        "status",
        "created_at",
    )
    list_filter = ("status", "category", "target_content_type")
    ordering = ("-created_at",)
    fields = (
        "id",
        "reporter",
        "category",
        "description",
        "target_content_type",
        "target_content_id",
        "status",
        "created_at",
    )
    readonly_fields = (
        "id",
        "reporter",
        "category",
        "description",
        "target_content_type",
        "target_content_id",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False



@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = (
        "get_display_name", 
        "action_type", 
        "user", 
        "target_object_type", 
        "timestamp", 
        "moderation_status",
    )
    list_filter = ("action_type", "user", "target_object_type",)
    ordering = ("-timestamp",)
    fields = (
        "id",
        "user", 
        "action_type", 
        "timestamp", 
        "target_object_type", 
        "target_object_id", 
        "moderation_status", 
        "details",
    )

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
        "get_display_name", 
        "target_object_type", 
        "content_name", 
        "dominant_attribute", 
        "severity_score", 
        "flagged_at",
    )
    ordering = ("-flagged_at",)

    fields = (
        "dominant_attribute", 
        "severity_score", 
        "reason", 
        "details", 
        "flagged_at", 
        "is_content_image", 
        "content_name", 
        "content", 
        "target_object_type", 
        "target_object_id",
    )

    readonly_fields = (*fields,)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(is_resolved=False)
    
    def get_display_name(self, obj: FlaggedContent) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"

    def response_change(self, request, obj):
        if "_resolve_flag" in request.POST:
            if isinstance(obj, FlaggedContent):
                obj.resolve()

                self.message_user(
                    request,
                    "Flag resolved successfully.",
                    level=messages.SUCCESS,
                )
                LogEntryService.create_log_entry(None, LogEntry.ActionTypeChoices.RESOLVE_FLAG, obj)
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
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ModerationThreshold)
class ModerationThresholdAdmin(admin.ModelAdmin):
    list_display = (
        "get_display_name",
        "attribute",
        "service_api",
        "service_type",
        "flag_threshold",
        "ban_threshold",
        "is_active",
    )
    ordering = ("service_api",)
    fields = (
        "id",
        "attribute",
        "service_type",
        "service_api",
        "flag_threshold",
        "ban_threshold",
        "is_active",
        "updated_at",
    )
    readonly_fields = (
        "id",
        "updated_at",
    )

    def get_display_name(self, obj: ModerationThreshold) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"