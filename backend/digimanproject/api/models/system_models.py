from __future__ import annotations
from typing import Any, Dict, Optional, Union
from datetime import datetime
from django.db import models
from django.utils import timezone
import uuid

from .common_choice_classes import ModerationStatusChoices
from ..utils.helper_functions import get_target_object, update_instance, cast_user_to_subclass, remove_unchanged_and_denied_fields
from django.contrib import admin

from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from .manga_models import MangaTitle, Chapter, Genre, Author, Page, Comment
    from .user_models import User, Reader, Administrator

ReportTargetContentType = Union["MangaTitle", "Chapter", "Comment", "User"]

FlaggedContentTargetObjectType = Union[
    "Comment", "User", "Reader", "Administrator",
]

LogEntryTargetObjectType = Union[
    "MangaTitle", "Chapter", "Page", "Genre", "Author", "Comment", 
    "User", "Reader", "Administrator", "Report", "FlaggedContent", "Penalty"
]

class Report(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pending"
        RESOLVED = "resolved", "Resolved"
        DISMISSED = "dismissed", "Dismissed"

    class TargetContentTypeChoices(models.TextChoices):
        MANGA_TITLE = "manga_title", "MangaTitle"
        CHAPTER = "chapter", "Chapter"
        COMMENT = "comment", "Comment"
        USER = "user", "User"

    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    reporter: "User" = models.ForeignKey(
        "User", related_name="reports", on_delete=models.CASCADE)
    category: str = models.CharField(max_length=100)
    description: str = models.TextField(blank=True)
    status: str = models.CharField(
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING
    )
    created_at: datetime = models.DateTimeField(default=timezone.now)
    target_content_type: str = models.CharField(
        max_length=50,
        choices=TargetContentTypeChoices.choices)
    target_content_id: uuid.UUID = models.UUIDField()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Report"
        verbose_name_plural = "Reports"

    def __str__(self) -> str:
        return f"Report {self.id} - by {self.reporter.get_display_name()}\
            - category {self.category}"
    
    def get_target_object(self) -> Optional[ReportTargetContentType]:
        from .manga_models import MangaTitle, Chapter, Comment
        from .user_models import User
        
        mapping: Dict[str, ReportTargetContentType] = {
            self.TargetContentTypeChoices.MANGA_TITLE.value: MangaTitle,
            self.TargetContentTypeChoices.CHAPTER.value: Chapter,
            self.TargetContentTypeChoices.COMMENT.value: Comment,
            self.TargetContentTypeChoices.USER.value: User,
        }
        return get_target_object(self.target_content_id, self.target_content_type, mapping)
            
    def update_status(self, status: str) -> None:
        self.status = status
        self.save(update_fields=["status"])


class Penalty(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    user: "User" = models.OneToOneField(
        "User", on_delete=models.CASCADE, related_name="penalties")
    reason: str = models.TextField()
    duration_hours: int = models.IntegerField(default=0)
    timestamp: datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Penalty"
        verbose_name_plural = "Penalties"

    def __str__(self) -> str:
        return f"Penalty for {self.user.get_display_name()} - at {self.timestamp}"


class FlaggedContent(models.Model):
    class TargetObjectTypeChoices(models.TextChoices):
        COMMENT = "comment", "Comment"
        USER = "user", "User"
        READER = "reader", "Reader"
        ADMINISTRATOR = "administrator", "Administrator"

    class FlagStatusChoices(models.TextChoices):
        FLAGGED = "flagged", "Flagged"
        BANNED = "banned", "Banned"
    
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    severity_score: float = models.FloatField(default=0.0)
    dominant_attribute: str = models.CharField(max_length=100, default="")
    reason: str = models.TextField()
    details: dict[str, Any] = models.JSONField(null=False, default=dict)

    flag_status: str = models.CharField(
        max_length=20,
        choices=FlagStatusChoices.choices,
        default=FlagStatusChoices.FLAGGED
    )
    flagged_at: datetime = models.DateTimeField(default=timezone.now)
    is_resolved: bool = models.BooleanField(default=False)

    is_content_image: bool = models.BooleanField(default=False)
    content_name: str = models.CharField(max_length=100, default="")
    content: str = models.TextField()

    target_object_type: str = models.CharField(
        choices=TargetObjectTypeChoices.choices)
    target_object_id: uuid.UUID = models.UUIDField()

    class Meta:
        ordering = ["-flagged_at"]
        verbose_name = "Flagged Content"
        verbose_name_plural = "Flagged Contents"

    def __str__(self) -> str:
        from ..services.system_service import FlaggedContentService
        index = FlaggedContentService.get_flagged_content_index(self)
        return f"Flagged Content #{index} on {self.target_object_type}'s {self.content_name}"
    
    def get_target_object(self) -> Optional[FlaggedContentTargetObjectType]:
        from .manga_models import Comment
        from .user_models import User, Reader, Administrator
        
        mapping: Dict[str, FlaggedContentTargetObjectType] = {
            self.TargetObjectTypeChoices.COMMENT.value: Comment,
            self.TargetObjectTypeChoices.USER.value: User,
            self.TargetObjectTypeChoices.READER.value: Reader,
            self.TargetObjectTypeChoices.ADMINISTRATOR.value: Administrator,
        }
        return get_target_object(self.target_object_id, self.target_object_type, mapping)
    
    def resolve(self) -> None:
        self.is_resolved = True
        self.save(update_fields=["is_resolved"])
        

class ModerationThreshold(models.Model):
    class ServiceType(models.TextChoices):
        TEXT = "text"
        IMAGE = "image"

    class ServiceAPI(models.TextChoices):
        PERSPECTIVE_API = "perspective_api", "Perspective API"
        SIGHTENGINE = "sightengine", "Sightengine"
    
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    service_type: str = models.CharField(
        max_length=10,
        choices=ServiceType.choices,
        default=ServiceType.TEXT
    )
    attribute: str = models.CharField(max_length=100)
    flag_threshold: float = models.FloatField(default=0.0)
    ban_threshold: float = models.FloatField(default=1.0)
    is_active: bool = models.BooleanField(default=True)
    service_api: str = models.CharField(
        max_length=50,
        choices=ServiceAPI.choices,
        default=ServiceAPI.PERSPECTIVE_API
    )
    updated_at: datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Moderation Threshold"
        verbose_name_plural = "Moderation Thresholds"

    def __str__(self) -> str:
        return f"{self.service_api} - {self.service_type} - {self.attribute}"
    
    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        super(ModerationThreshold, self).save(*args, **kwargs)

    def update_metadata(self, **metadata: Any) -> bool:
        """Allowed fields: flag_threshold, ban_threshold, is_active"""
        allowed_fields = [
            "flag_threshold", "ban_threshold", "is_active"
        ]
        metadata = remove_unchanged_and_denied_fields(self, allowed_fields, **metadata)
        return update_instance(self, **metadata)


class LogEntry(models.Model):
    class ActionTypeChoices(models.TextChoices):
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        AUTO_RESOLVE_FLAG = "autoresolveflag", "AutoResolveFlag"
        RESOLVE_FLAG = "resolveflag", "ResolveFlag"

    class TargetObjectTypeChoices(models.TextChoices):
        MANGA_TITLE = "mangatitle", "MangaTitle"
        CHAPTER = "chapter", "Chapter"
        PAGE = "page", "Page"
        GENRE = "genre", "Genre"
        AUTHOR = "author", "Author"
        COMMENT = "comment", "Comment"
        USER = "user", "User"
        READER = "reader", "Reader"
        ADMINISTRATOR = "administrator", "Administrator"
        REPORT = "report", "Report"
        FLAGGED_CONTENT = "flaggedcontent", "FlaggedContent"
        PENALTY = "penalty", "Penalty"
        MODERATION_THRESHOLD = "moderationthreshold", "ModerationThreshold"

    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    user: Optional["User"] = models.ForeignKey(
        "User", on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name="log_entries"
    )
    action_type: str = models.CharField(
        choices=ActionTypeChoices.choices)
    timestamp: datetime = models.DateTimeField(default=timezone.now)

    moderation_status: str = models.CharField(
        max_length=20,
        choices=ModerationStatusChoices.choices,
        default=ModerationStatusChoices.SAFE
    )
    retry_count: int = models.PositiveSmallIntegerField(default=0)
    last_error: str = models.TextField(null=True, blank=True)
    moderation_started_at: datetime = models.DateTimeField(null=True, blank=True)
    moderation_finished_at: datetime = models.DateTimeField(null=True, blank=True)

    target_object_type: str = models.CharField(choices=TargetObjectTypeChoices.choices)
    target_object_id: uuid.UUID = models.UUIDField()
    details: dict[str, Any] = models.JSONField(null=False, default=dict)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Log Entry"
        verbose_name_plural = "Log Entries"

    def __str__(self) -> str:
        if self.action_type in {self.ActionTypeChoices.LOGIN, self.ActionTypeChoices.LOGOUT}:
            return f"{self.get_user_display_name()} {self.action_type}"
        return f"{self.action_type} {self.target_object_type} by {self.get_user_display_name()}"
    
    @admin.display(description="User")
    def get_user_display_name(self) -> str:
        if not self.user:
            return "N/A"
        user = cast_user_to_subclass(self.user)
        return user.get_display_name()
    
    def get_moderation_status(self) -> str:
        return self.moderation_status
    
    def get_details(self) -> dict[str, Any]:
        return self.details
    
    def get_target_object(self) -> Optional[LogEntryTargetObjectType]:
        from .manga_models import MangaTitle, Chapter, Genre, Author, Page, Comment
        from .user_models import User, Reader, Administrator
        
        mapping: Dict[str, LogEntryTargetObjectType] = {
            self.TargetObjectTypeChoices.MANGA_TITLE.value: MangaTitle,
            self.TargetObjectTypeChoices.CHAPTER.value: Chapter,
            self.TargetObjectTypeChoices.PAGE.value: Page,
            self.TargetObjectTypeChoices.GENRE.value: Genre,
            self.TargetObjectTypeChoices.AUTHOR.value: Author,
            self.TargetObjectTypeChoices.COMMENT.value: Comment,
            self.TargetObjectTypeChoices.USER.value: User,
            self.TargetObjectTypeChoices.READER.value: Reader,
            self.TargetObjectTypeChoices.ADMINISTRATOR.value: Administrator,
            self.TargetObjectTypeChoices.REPORT.value: Report,
            self.TargetObjectTypeChoices.FLAGGED_CONTENT.value: FlaggedContent,
            self.TargetObjectTypeChoices.PENALTY.value: Penalty,
            self.TargetObjectTypeChoices.MODERATION_THRESHOLD.value: ModerationThreshold
        }
        return get_target_object(self.target_object_id, self.target_object_type, mapping)

    def update_metadata(self, **metadata: Any) -> bool:
        """Allowed fields: moderation_status, retry_count, last_error, moderation_started_at, moderation_finished_at"""
        allowed_fields = [
            "moderation_status", 
            "retry_count", 
            "last_error",
            "moderation_started_at",
            "moderation_finished_at",
        ]
        metadata = remove_unchanged_and_denied_fields(self, allowed_fields, **metadata)
        return update_instance(self, **metadata)

    def set_moderation_status(self, status: str) -> None:
        if not self.moderation_started_at and status == ModerationStatusChoices.PROCESSING:
            self.update_metadata(
                moderation_started_at=timezone.now(),
                moderation_status=status
            )
            return
        if status in {
            ModerationStatusChoices.SAFE,
            ModerationStatusChoices.FLAGGED,
            ModerationStatusChoices.BANNED,
        }:
            self.update_metadata(
                moderation_status=status,
                moderation_finished_at=timezone.now(),
            )
            return
        self.moderation_status = status
        self.save(update_fields=["moderation_status"])

    def set_failed_moderation_attempt(self, last_error: str) -> None:
        if self.retry_count >= 2:
            self.update_metadata(
                moderation_status=ModerationStatusChoices.FAILED,
                retry_count=3,
                last_error=last_error
            )
        else:
            self.update_metadata(
                moderation_status=ModerationStatusChoices.PENDING,
                retry_count=self.retry_count + 1,
                last_error=last_error
            )
