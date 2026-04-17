from __future__ import annotations
from typing import Any, Optional
from datetime import datetime
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

import uuid
from ..utils.helper_functions import update_instance

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .manga_models import MangaTitle, Chapter
    from .reader_models import ReadingProgress
    from .community_models import Comment, Report

class User(AbstractUser):
    class RoleChoices(models.TextChoices):
        ADMIN = "admin", "Administrator"
        READER = "reader", "Reader"

    class StatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        DEACTIVATED = "deactivated", "Deactivated"
        DELETED = "deleted", "Deleted"
    
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    role: str = models.CharField(
        choices=RoleChoices.choices,
        default=RoleChoices.READER)
    status: str = models.CharField(
        choices=StatusChoices.choices, 
        default=StatusChoices.ACTIVE)
    created_at: datetime = models.DateTimeField(
        default=timezone.now, editable=False)
    
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.username
    
    def get_avatar(self):
        return ""
    
    def get_display_name(self):
        return self.username

    def update_password(self, password: str) -> None:
        self.set_password(password)
        self.save()

    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: """
        allowed_fields = {
            "username", "email", "password", "status"
        }
        update_instance(self, allowed_fields, **metadata)

    def set_deleted(self) -> None:
        self.status = User.StatusChoices.DELETED
        self.save(update_fields=["status"])


class Reader(User):
    display_name: str = models.CharField(max_length=100, blank=True, default="")
    avatar: str = models.URLField(blank=True, null=True, default="")
    
    class Meta:
        verbose_name = "Reader"
        verbose_name_plural = "Readers"

    def __str__(self):
        return self.get_display_name()

    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: """
        allowed_fields = {
            "username", "email", "password", "status", "display_name", "avatar"
        }
        update_instance(self, allowed_fields, **metadata)
   
    def get_display_name(self):
        return self.display_name if self.display_name != "" else super().get_display_name()
    
    def get_avatar(self):
        return self.avatar if self.avatar != "" else super().get_avatar()

    # Comment Management
    def post_comment(
        self, text: Optional[str] = None,
        attached_image_url: Optional[str] = None,
        parent_comment: Optional["Comment"] = None, 
        manga_title: Optional["MangaTitle"] = None, 
        chapter: Optional["Chapter"] = None
    ) -> "Comment":
        from .community_models import Comment
        
        return Comment.objects.create(
            owner=self, text=text, attached_image_url=attached_image_url,
            parent_comment=parent_comment, 
            manga_title=manga_title, chapter=chapter
        )

    def update_comment(
        self, comment: "Comment", 
        text: Optional[str] = None,
        attached_image_url: Optional[str] = None,
    ) -> None:
        comment.update_metadata(text=text, attached_image_url=attached_image_url)

    def delete_comment(self, comment: "Comment") -> None:
        comment.set_deleted()

    # Report Management
    def post_report(
        self, content: str, target_content_type: str, 
        target_content_id: uuid.UUID
    ) -> "Report":
        from .community_models import Report
        
        if target_content_type not in Report.TargetContentTypeChoices.values():
            raise ValueError(f"Invalid target content type: {target_content_type}")
        return Report.objects.create(
            owner=self, content=content, 
            target_content_type=target_content_type, 
            target_content_id=target_content_id
        )

class Administrator(Reader):
    
    class Meta:
        verbose_name = "Admin"
        verbose_name_plural = "Admins"