from django.contrib import admin
from django.shortcuts import redirect
from django.contrib import messages
from django.urls import reverse
from django.utils.html import format_html

from ..models.system_models import Report, LogEntry, FlaggedContent, ModerationThreshold
from ..services.system_service import FlaggedContentService


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
        "view_target_content_details",
    )
    readonly_fields = tuple(field for field in fields if field != "status")
    
    def view_target_content_details(self, obj: Report):
        if obj.pk and not obj._state.adding and obj.target_content_id and obj.target_content_type:
            url = reverse(f"admin:api_{obj.target_content_type.lower()}_change", args=[obj.target_content_id])
            return format_html('<a href="{}">View</a>', url)
        return ""
    view_target_content_details.short_description = "View Target Content Details"

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
    list_filter = ("action_type", "user", "target_object_type", "moderation_status",)
    ordering = ("-timestamp",)
    fields = (
        "id",
        "user", 
        "action_type", 
        "timestamp", 
        "moderation_status", 
        "retry_count",
        "last_error",
        "moderation_started_at",
        "moderation_finished_at",
        "target_object_type", 
        "target_object_id", 
        "details",
        "view_target_object_details",
    )

    def get_display_name(self, obj: LogEntry) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"
    
    def view_target_object_details(self, obj: LogEntry):
        if obj.pk and not obj._state.adding and obj.target_object_id and obj.target_object_type:
            url = reverse(f"admin:api_{obj.target_object_type.lower()}_change", args=[obj.target_object_id])
            return format_html('<a href="{}">View</a>', url)
        return ""
    view_target_object_details.short_description = "View Target Object Details"

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
        "flag_status", 
        "flagged_at",
        "is_resolved",
    )
    list_filter = ("flag_status", "target_object_type", "is_resolved",)
    ordering = ("is_resolved", "-flagged_at",)

    fields = (
        "id",
        "dominant_attribute", 
        "severity_score", 
        "reason", 
        "details", 
        "flag_status",
        "flagged_at", 
        "is_content_image", 
        "content_name", 
        "content", 
        "target_object_type", 
        "target_object_id",
        "is_resolved",
        "view_target_object_details",
    )
    readonly_fields = (*fields,)

    change_form_template = "admin/flagged_content_change_form.html"
    
    def get_display_name(self, obj: FlaggedContent) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"
    
    def view_target_object_details(self, obj: LogEntry):
        if obj.pk and not obj._state.adding and obj.target_object_id and obj.target_object_type:
            url = reverse(f"admin:api_{obj.target_object_type.lower()}_change", args=[obj.target_object_id])
            return format_html('<a href="{}">View</a>', url)
        return ""
    view_target_object_details.short_description = "View Target Object Details"
    
    def response_change(self, request, obj):
        if not "_resolve_flag" in request.POST:
            return super().response_change(request, obj)
        
        if isinstance(obj, FlaggedContent):
            FlaggedContentService.resolve_flag(obj)
            self.message_user(
                request,
                "Flag resolved successfully.",
                level=messages.SUCCESS,
            )
        else:
            self.message_user(
                request,
                "Object is not a FlaggedContent.",
                level=messages.ERROR,
            )

        return redirect("admin:api_flaggedcontent_changelist")

    def save_model(self, request, obj, form, change):
        if change:
            return  # block manual save
        super().save_model(request, obj, form, change)

    def has_add_permission(self, request):
        return False
    
    # def has_delete_permission(self, request, obj=None):
    #     return False


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