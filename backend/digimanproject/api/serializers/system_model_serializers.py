from rest_framework import serializers
from ..models.system_models import Report, Penalty, FlaggedContent, LogEntry, ModerationThreshold


TEXT_MODERATION_CATEGORIES = [
    "text_toxicity",
    "text_severe_toxicity",
    "text_sexually_explicit",
    "text_profanity",
]

IMAGE_MODERATION_CATEGORIES = [
    "image_sexual_activity",
    "image_sexual_display",
    "image_erotica",
    "image_suggestive_content",
    "image_gore",
    "image_offensive",
]


REPORT_CATEGORIES_BY_TARGET = {
    "manga_title": [
        "duplicate_entry",
        "information_to_correct",
        "missing_cover_art",
        "troll_entry",
        "vandalism",
        "other",
    ],
    "comment": [
        "harassment",
        "spam",
        *TEXT_MODERATION_CATEGORIES,
        *IMAGE_MODERATION_CATEGORIES,
    ],
    "user": [
        "offensive_username",
        "offensive_avatar",
        "spambot",
        *TEXT_MODERATION_CATEGORIES,
        *IMAGE_MODERATION_CATEGORIES,
        "other",
    ],
    "chapter": [
        "inappropriate_content",
        "misleading_metadata",
        "other",
    ],
}

ALL_REPORT_CATEGORIES = sorted({
    category
    for categories in REPORT_CATEGORIES_BY_TARGET.values()
    for category in categories
})


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "id",
            "reporter_id",
            "category",
            "description",
            "status",
            "created_at",
            "target_content_type",
            "target_content_id",
        ]
        read_only_fields = ["id", "reporter_id", "status", "created_at"]

    def validate_category(self, value):
        target_content_type = self.initial_data.get("target_content_type")
        if not target_content_type and self.instance:
            target_content_type = self.instance.target_content_type

        allowed_for_target = REPORT_CATEGORIES_BY_TARGET.get(target_content_type, [])
        if allowed_for_target and value not in allowed_for_target:
            raise serializers.ValidationError(
                "Invalid category for target_content_type "
                f"'{target_content_type}'. Must be one of: {', '.join(allowed_for_target)}"
            )

        if value not in ALL_REPORT_CATEGORIES:
            raise serializers.ValidationError(
                f"Invalid category. Must be one of: {', '.join(ALL_REPORT_CATEGORIES)}"
            )
        return value

    def validate_target_content_type(self, value):
        from ..models.system_models import Report as ReportModel
        valid = [c[0] for c in ReportModel.TargetContentTypeChoices.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid target_content_type. Must be one of: {', '.join(valid)}"
            )
        return value
    

class PenaltySerializer(serializers.ModelSerializer):
    class Meta:
        model = Penalty
        fields = [
            "id", 
            "user_id", 
            "reason", 
            "duration_hours", 
            "timestamp"
        ]


class FlaggedContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlaggedContent
        fields = [
            "id", 
            "severity_score", 
            "dominant_attribute", 
            "reason", 
            "details",
            "flagged_at", 
            "is_resolved", 
            "is_content_image", 
            "content_name", 
            "content", 
            "target_object_type", 
            "target_object_id"
        ]
        

class ModerationThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModerationThreshold
        fields = [
            "id", 
            "service_type",
            "attribute", 
            "flag_threshold", 
            "ban_threshold", 
            "is_active", 
            "service_api", 
            "updated_at"
        ]


class LogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LogEntry
        fields = [
            "id", 
            "user_id", 
            "action_type", 
            "timestamp", 
            "target_object_type", 
            "target_object_id", 
            "moderation_status", 
            "retry_count",
            "last_error",
            "details"
        ]
        