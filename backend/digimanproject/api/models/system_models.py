from __future__ import annotations
from typing import Any, Dict, Optional, Union
from datetime import datetime
from django.db import models
from django.utils import timezone
import uuid
from ..utils.helper_functions import get_target_object, update_instance
from django.contrib import admin

from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from .manga_models import MangaTitle, Chapter, Genre, Author, Page
    from .user_models import User
    from .community_models import Comment, Report, Penalty

FlaggedContentTargetContentType = Union["MangaTitle", "Chapter", 
                                        "Page", "Comment", "User"]

LogEntryTargetObjectType = Union["MangaTitle", "Chapter", "Page", "Genre", 
                                 "Author", "Comment", "User", "Report", 
                                 "FlaggedContent", "Announcement", "Penalty"]


class FlaggedContent(models.Model):
    class TargetContentTypeChoices(models.TextChoices):
        MANGA_TITLE = "mangatitle", "MangaTitle"
        CHAPTER = "chapter", "Chapter"
        PAGE = "page", "Page"
        COMMENT = "comment", "Comment"
        USER = "user", "User"
    
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    severity_score: float = models.FloatField(default=0.0)
    dominant_attribute: str = models.CharField(max_length=100, default="")
    reason: str = models.TextField()
    details: dict[str, Any] = models.JSONField(null=False, default=dict)
    flagged_at: datetime = models.DateTimeField(default=timezone.now)
    is_resolved: bool = models.BooleanField(default=False)
    is_content_image: bool = models.BooleanField(default=False)
    content_name: str = models.CharField(max_length=100, default="")
    content: str = models.TextField()
    target_content_type: str = models.CharField(
        choices=TargetContentTypeChoices.choices)
    target_content_id: uuid.UUID = models.UUIDField()

    def __str__(self) -> str:
        return f"Flagged Content {self.id} - at {self.flagged_at}"
    
    def get_target_object(self) -> Optional[FlaggedContentTargetContentType]:
        from .manga_models import MangaTitle, Chapter, Page
        from .user_models import User
        from .community_models import Comment
        
        mapping: Dict[str, FlaggedContentTargetContentType] = {
            self.TargetContentTypeChoices.MANGA_TITLE.value: MangaTitle,
            self.TargetContentTypeChoices.CHAPTER.value: Chapter,
            self.TargetContentTypeChoices.PAGE.value: Page,
            self.TargetContentTypeChoices.COMMENT.value: Comment,
            self.TargetContentTypeChoices.USER.value: User,
        }
        return get_target_object(self.target_content_id,
                    self.target_content_type, mapping)
    
    def resolve(self) -> None:
        self.is_resolved = True
        self.save(update_fields=["is_resolved"])


class Announcement(models.Model):
    class StatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        SCHEDULED = "scheduled", "Scheduled"
        EXPIRED = "expired", "Expired"
        HIDDEN = "hidden", "Hidden"

    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    title: str = models.CharField(max_length=200)
    content: str = models.TextField()
    created_at: datetime = models.DateTimeField(default=timezone.now)
    scheduled_at: Optional[datetime] = models.DateTimeField(null=True, blank=True)
    expired_at: Optional[datetime] = models.DateTimeField(null=True, blank=True)
    status: str = models.CharField(
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE,
    )

    def __str__(self) -> str:
        return f"Announcement {self.id} - {self.title}"
    
    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: title, content"""
        allowed_fields = {"title", "content"}
        update_instance(self, allowed_fields, **metadata)
    
    def update_status(
            self, status: str, 
            scheduled_at: Optional[datetime] = None,
            expired_at: Optional[datetime] = None
        ) -> None:
        if status not in self.StatusChoices.values:
            raise ValueError(f"Invalid status: {status}")
        self.status = status
        updated_fields = ["status"]

        if scheduled_at is not None:
            self.scheduled_at = scheduled_at
            updated_fields.append("scheduled_at")
        elif expired_at is not None:
            self.expired_at = expired_at
            updated_fields.append("expired_at")

        if updated_fields:
            self.full_clean()
            self.save(update_fields=updated_fields)


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
        REPORT = "report", "Report"
        FLAGGED_CONTENT = "flaggedcontent", "FlaggedContent"
        ANNOUNCEMENT = "announcement", "Announcement"
        PENALTY = "penalty", "Penalty"

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
    target_object_type: str = models.CharField(
        choices=TargetObjectTypeChoices.choices)
    target_object_id: uuid.UUID = models.UUIDField()
    is_moderated: bool = models.BooleanField(default=False)
    details: dict[str, Any] = models.JSONField(null=False, default=dict)

    def __str__(self) -> str:
        if self.action_type in {self.ActionTypeChoices.LOGIN, self.ActionTypeChoices.LOGOUT}:
            return f"{self.user.get_display_name()} {self.action_type}"
        return f"{self.action_type} {self.target_object_type} by {self.get_user_display_name()}"
    
    @admin.display(description="User")
    def get_user_display_name(self) -> str:
        return self.user.get_display_name() if self.user else "N/A"
    
    def get_target_object(self) -> Optional[LogEntryTargetObjectType]:
        from .manga_models import MangaTitle, Chapter, Genre, Author, Page
        from .user_models import User
        from .community_models import Comment, Report, Penalty
        
        mapping: Dict[str, LogEntryTargetObjectType] = {
            self.TargetObjectTypeChoices.MANGA_TITLE.value: MangaTitle,
            self.TargetObjectTypeChoices.CHAPTER.value: Chapter,
            self.TargetObjectTypeChoices.PAGE.value: Page,
            self.TargetObjectTypeChoices.GENRE.value: Genre,
            self.TargetObjectTypeChoices.AUTHOR.value: Author,
            self.TargetObjectTypeChoices.COMMENT.value: Comment,
            self.TargetObjectTypeChoices.USER.value: User,
            self.TargetObjectTypeChoices.REPORT.value: Report,
            self.TargetObjectTypeChoices.FLAGGED_CONTENT.value: FlaggedContent,
            self.TargetObjectTypeChoices.ANNOUNCEMENT.value: Announcement,
            self.TargetObjectTypeChoices.PENALTY.value: Penalty,
        }
        return get_target_object(self.target_object_id,
                    self.target_object_type, mapping)

    def moderate(self) -> None:
        self.is_moderated = True
        self.save(update_fields=["is_moderated"])
        