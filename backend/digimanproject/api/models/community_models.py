from __future__ import annotations
from typing import Any, Dict, Optional, Union
from datetime import datetime
from django.db import models
from django.utils import timezone


import uuid
from ..utils.helper_functions import get_target_object, update_instance, cast_user_to_subclass

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
        "MangaTitle", on_delete=models.CASCADE, null=True, blank=True, related_name="comments")
    chapter: Optional["Chapter"] = models.ForeignKey(
        "Chapter", on_delete=models.CASCADE, null=True, blank=True, related_name="comments")
    parent_comment: Optional["Comment"] = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE)
    text: str = models.TextField(max_length=2000, blank=True, null=True)
    attached_image_url: str = models.URLField(blank=True, null=True)
    created_at: datetime = models.DateTimeField(default=timezone.now)
    status: str = models.CharField(
        choices=StatusChoices.choices, 
        default=StatusChoices.ACTIVE
    )
    hidden_reasons: str = models.TextField(blank=True)
    is_edited: bool = models.BooleanField(default=False)

    def __str__(self) -> str:
        index = Comment.get_comment_index(self)
        where = self.manga_title if self.manga_title else self.chapter
        if index is not None:
            return f"Comment #{index} in {where}"
        else:
            return f"Comment by {self.get_owner_name()} at {self.created_at}"
        
    def get_owner_name(self) -> str:
        return (cast_user_to_subclass(self.owner).get_display_name() 
                if self.owner else "Guest")
    
    def get_owner_avatar(self) -> str:
        return (cast_user_to_subclass(self.owner).get_avatar() 
                if self.owner else "")

    def toggle_hidden(self, hidden_reasons: str = "") -> None:
        self.status = (
            Comment.StatusChoices.HIDDEN 
            if self.status == Comment.StatusChoices.ACTIVE else 
            Comment.StatusChoices.ACTIVE
        )
        self.hidden_reasons = hidden_reasons
        self.save(update_fields=["status", "hidden_reasons"])
    
    def set_deleted(self) -> None:
        self.status = Comment.StatusChoices.DELETED
        self.save(update_fields=["status"])

    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: text, attached_image_url, status, hidden_reasons"""
        allowed_fields = {"text", "attached_image_url", "status", "hidden_reasons"}

        # set is_edited to True if any of the allowed fields are changed
        if not self.is_edited and any(field in allowed_fields for field in metadata.keys()):
            metadata["is_edited"] = True
            allowed_fields.add("is_edited")
            
        update_instance(self, allowed_fields, **metadata)

    @staticmethod
    def get_comment_index(comment: Comment) -> Optional[int]:
        if comment.manga_title:
            comments = comment.manga_title.get_comments().order_by("created_at")
        elif comment.chapter:
            comments = comment.chapter.get_comments().order_by("created_at")
        else:
            return None
        return comments.filter(created_at__lte=comment.created_at).count()
        


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
        choices=RelatedObjectTypeChoices.choices)
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
