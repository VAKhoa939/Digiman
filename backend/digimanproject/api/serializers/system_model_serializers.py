from rest_framework import serializers
from ..models.system_models import FlaggedContent, Announcement, LogEntry


class FlaggedContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlaggedContent
        fields = [
            "id", "severity_score", "reason", "flagged_at", "is_resolved", 
            "is_content_image", "content", "target_content_type", 
            "target_content_id"
        ]
        read_only_fields = [
            field for field in fields if field != "is_resolved"
        ]


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = [
            "id", "title", "content", "created_at", "scheduled_at", 
            "expired_at", "status"
        ]
        read_only_fields = [
            field for field in fields if field not in {"title", "content", "status"}
        ]


class LogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LogEntry
        fields = [
            "id", "user_id", "action_type", "timestamp", "target_object_type", 
            "target_object_id", "is_moderated", "details"
        ]
        read_only_fields = [
            field for field in fields if field != "is_moderated"
        ]
        