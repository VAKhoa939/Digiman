from rest_framework import serializers
from ..models.system_models import Report, Penalty, FlaggedContent, LogEntry


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "id", "reporter_id", "category", "description", "status",
            "admin_message", "created_at", "target_content_type", 
            "target_content_id"
        ]
    

class PenaltySerializer(serializers.ModelSerializer):
    class Meta:
        model = Penalty
        fields = [
            "id", "user_id", "reason", "duration_days", "timestamp"
        ]


class FlaggedContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlaggedContent
        fields = [
            "id", "severity_score", "dominant_attribute", "reason", "details",
            "flagged_at", "is_resolved", "is_content_image", "content_name", "content", 
            "target_object_type", "target_object_id"
        ]


class LogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LogEntry
        fields = [
            "id", "user_id", "action_type", "timestamp", "target_object_type", 
            "target_object_id", "is_moderated", "details"
        ]
        