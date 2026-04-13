from __future__ import annotations
from typing import Any, Dict, Optional, Union
from datetime import datetime
from django.db import models
from django.utils import timezone
import uuid
from ..utils.helper_functions import get_target_object, update_instance, cast_user_to_subclass
from django.contrib import admin

from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from .manga_models import MangaTitle, Chapter, Genre, Author, Page, Comment
    from .user_models import User, Reader, Administrator

ReportTargetContentType = Union["MangaTitle", "Chapter", "Comment", "User"]

FlaggedContentTargetObjectType = Union[
    "MangaTitle", "Chapter", "Page", "Comment", "User", "Reader", "Administrator",
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
        return get_target_object(self.target_content_id,
                    self.target_content_type, mapping)
        
    
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

    def __str__(self) -> str:
        return f"Penalty for {self.user.get_display_name()} - at {self.timestamp}"


class FlaggedContent(models.Model):
    class TargetObjectTypeChoices(models.TextChoices):
        MANGA_TITLE = "mangatitle", "MangaTitle"
        CHAPTER = "chapter", "Chapter"
        PAGE = "page", "Page"
        COMMENT = "comment", "Comment"
        USER = "user", "User"
        READER = "reader", "Reader"
        ADMINISTRATOR = "administrator", "Administrator"
    
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

    target_object_type: str = models.CharField(
        choices=TargetObjectTypeChoices.choices)
    target_object_id: uuid.UUID = models.UUIDField()

    def __str__(self) -> str:
        from ..services.system_service import FlaggedContentService
        index = FlaggedContentService.get_flagged_content_index(self)
        return f"Flagged Content #{index} on {self.target_object_type}'s {self.content_name}"
    
    def get_target_object(self) -> Optional[FlaggedContentTargetObjectType]:
        from .manga_models import MangaTitle, Chapter, Page, Comment
        from .user_models import User, Reader, Administrator
        
        mapping: Dict[str, FlaggedContentTargetObjectType] = {
            self.TargetObjectTypeChoices.MANGA_TITLE.value: MangaTitle,
            self.TargetObjectTypeChoices.CHAPTER.value: Chapter,
            self.TargetObjectTypeChoices.PAGE.value: Page,
            self.TargetObjectTypeChoices.COMMENT.value: Comment,
            self.TargetObjectTypeChoices.USER.value: User,
            self.TargetObjectTypeChoices.READER.value: Reader,
            self.TargetObjectTypeChoices.ADMINISTRATOR.value: Administrator,
        }
        return get_target_object(self.target_object_id,
                    self.target_object_type, mapping)
    
    def resolve(self) -> None:
        self.is_resolved = True
        self.save(update_fields=["is_resolved"])


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
            return f"{self.get_user_display_name()} {self.action_type}"
        return f"{self.action_type} {self.target_object_type} by {self.get_user_display_name()}"
    
    @admin.display(description="User")
    def get_user_display_name(self) -> str:
        if not self.user:
            return "N/A"
        user = cast_user_to_subclass(self.user)
        return user.get_display_name()
    
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
        }
        return get_target_object(self.target_object_id,
                    self.target_object_type, mapping)

    def moderate(self) -> None:
        """Mark the log entry as moderated."""
        self.is_moderated = True
        self.save(update_fields=["is_moderated"])
        