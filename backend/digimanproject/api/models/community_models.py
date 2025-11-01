from __future__ import annotations
from typing import Dict, Optional, Union
from datetime import datetime
from django.db import models
from django.utils import timezone
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError

import uuid
from ..utils.helper_functions import get_target_object

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .manga_models import MangaTitle, Chapter
    from .user_models import User
    from .system_models import Announcement

ReportTargetContentType = Union["MangaTitle", "Chapter", "Comment", "User"]
NotificationRelatedObjectType = Union["MangaTitle", "Chapter", "Comment", "Report", "Announcement"]


class Comment(models.Model):
    class StatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        DELETED = "deleted", "Deleted"
        HIDDEN = "hidden", "Hidden"

    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    owner: Optional["User"] = models.ForeignKey(
        "User", null=True, blank=True, on_delete=models.SET_NULL, related_name="comments")
    manga_title: Optional["MangaTitle"] = models.ForeignKey(
        "MangaTitle", on_delete=models.CASCADE, null=True, blank=True)
    chapter: Optional["Chapter"] = models.ForeignKey(
        "Chapter", on_delete=models.CASCADE, null=True, blank=True)
    parent_comment: Optional["Comment"] = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE)
    is_image: bool = models.BooleanField(default=False)
    content: str = models.TextField()
    created_at: datetime = models.DateTimeField(default=timezone.now)
    status: str = models.CharField(
        max_length=20, 
        choices=StatusChoices.choices, 
        default=StatusChoices.ACTIVE
    )
    hidden_reasons: str = models.TextField(blank=True)

    def clean(self):
        super().clean()
        if self.is_image:
            # must be a valid URL
            validator = URLValidator()
            try:
                validator(self.content)
            except ValidationError:
                raise ValidationError({"content": "Invalid image URL."})
        else:
            # must not be empty and should not look like a URL
            if not self.content.strip():
                raise ValidationError({"content": "Text comment cannot be empty."})

    def __str__(self) -> str:
        return f"Comment by {self.owner.get_display_name()} on {self.created_at}"
    
    def update_content(self, content: str) -> None:
        self.content = content
        self.save(update_fields=["content"])

    def toggle_hidden(self, hidden_reasons: str = "") -> None:
        self.status = "hidden" if self.status == "active" else "active"
        self.hidden_reasons = hidden_reasons
        self.save(update_fields=["status", "hidden_reasons"])
    
    def set_deleted(self) -> None:
        self.status = "deleted"
        self.save(update_fields=["status"])


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
        max_length=20, 
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING
    )
    admin_message: str = models.TextField(blank=True)
    created_at: datetime = models.DateTimeField(default=timezone.now)
    target_content_type: str = models.CharField(
        max_length=50,
        choices=TargetContentTypeChoices.choices)
    target_content_id: uuid.UUID = models.UUIDField()

    def __str__(self) -> str:
        return f"Report {self.id} - by {self.reporter.get_display_name()}\
            - category {self.category}"
    
    def get_target_object(self) -> \
        Optional[ReportTargetContentType]:
        from .manga_models import MangaTitle, Chapter
        from .user_models import User
        from .community_models import Comment
        
        mapping: Dict[str, ReportTargetContentType] = {
            self.TargetContentTypeChoices.MANGA_TITLE.value: MangaTitle,
            self.TargetContentTypeChoices.CHAPTER.value: Chapter,
            self.TargetContentTypeChoices.COMMENT.value: Comment,
            self.TargetContentTypeChoices.USER.value: User,
        }
        return get_target_object(self.target_content_id,
                    self.target_content_type, mapping)
        
    
    def update_status(self, status: str) -> None:
        self.status = status
        self.save(update_fields=["status"])

    def add_admin_message(self, message: str) -> None:
        self.admin_message = message
        self.save(update_fields=["admin_message"])


class Notification(models.Model):
    class TypeChoices(models.TextChoices):
        LIBRARY_UPDATE = "library_update", "Library Update"
        COMMENT_MENTION = "comment_mention", "Comment Mention"
        ANNOUNCEMENT = "announcement", "Announcement"
        REPORT_RELATED = "report_related", "Report Related"
    
    class RelatedObjectTypeChoices(models.TextChoices):
        MANGA_TITLE = "manga_title", "MangaTitle"
        CHAPTER = "chapter", "Chapter"
        COMMENT = "comment", "Comment"
        REPORT = "report", "Report"
        ANNOUNCEMENT = "announcement", "Announcement"

    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    user: "User" = models.ForeignKey(
        "User", on_delete=models.CASCADE, related_name="notifications")
    type: str = models.CharField(max_length=50, choices=TypeChoices.choices)
    title: str = models.CharField(max_length=200)
    content: str = models.TextField()
    is_read: bool = models.BooleanField(default=False)
    timestamp: datetime = models.DateTimeField(default=timezone.now)
    related_object_type: str = models.CharField(
        max_length=20, choices=RelatedObjectTypeChoices.choices)
    related_object_id: uuid.UUID = models.UUIDField()

    def __str__(self) -> str:
        return f"Notification {self.id} - {self.title}"
    
    def get_related_object(self) -> Optional[NotificationRelatedObjectType]:
        from .manga_models import MangaTitle, Chapter
        from .system_models import Announcement
        
        mapping: Dict[str, NotificationRelatedObjectType] = {
            self.RelatedObjectTypeChoices.MANGA_TITLE.value: MangaTitle,
            self.RelatedObjectTypeChoices.CHAPTER.value: Chapter,
            self.RelatedObjectTypeChoices.COMMENT.value: Comment,
            self.RelatedObjectTypeChoices.REPORT.value: Report,
            self.RelatedObjectTypeChoices.ANNOUNCEMENT.value: Announcement,
        }
        return get_target_object(self.related_object_id,
                    self.related_object_type, mapping)
    
    def mark_as_read(self) -> None:
        self.is_read = True
        self.save(update_fields=["is_read"])


class Penalty(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    user: "User" = models.OneToOneField(
        "User", on_delete=models.CASCADE, related_name="penalty")
    reason: str = models.TextField()
    duration_days: int = models.IntegerField(default=0)
    timestamp: datetime = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"Penalty for {self.user.get_display_name()} - at {self.timestamp}"
