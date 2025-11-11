from rest_framework import serializers
from ..models.community_models import Comment, Report, Notification, Penalty


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = [
            "id", "owner_id", "manga_title_id", "chapter_id", "parent_comment_id",
            "is_image", "content", "created_at", "status", "hidden_reasons"
        ]
        read_only_fields = [
            "id", "owner_id", "manga_title_id", "chapter_id", "parent_comment_id", 
            "created_at"
        ]


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "id", "reporter_id", "category", "description", "status",
            "admin_message", "created_at", "target_content_type", 
            "target_content_id"
        ]
        read_only_fields = [
            field for field in fields if field not in {"status", "admin_message"}
        ]
    

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "user_id", "type", "title", "content", "is_read", "timestamp",
            "related_object_type", "related_object_id"
        ]
        read_only_fields = [field for field in fields if field != "is_read"]


class PenaltySerializer(serializers.ModelSerializer):
    class Meta:
        model = Penalty
        fields = [
            "id", "user_id", "reason", "duration_days", "timestamp"
        ]
        read_only_fields = [*fields,]