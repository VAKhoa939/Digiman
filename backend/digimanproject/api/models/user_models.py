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
    from .manga_models import MangaTitle, Chapter, Comment
    from .system_models import Report
    from .subscription_models import ReaderSubscription


class RoleChoices(models.TextChoices):
    ADMIN = "admin", "Administrator"
    READER = "reader", "Reader"


class User(AbstractUser):
    class StatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        DEACTIVATED = "deactivated", "Deactivated"
        DELETED = "deleted", "Deleted"

    class ModerationStatusChoices(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        SAFE = "safe", "Safe"
        FLAGGED = "flagged", "Flagged"
        BANNED = "banned", "Banned"
        FAILED = "failed", "Failed"
    
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

    moderation_status: str = models.CharField(
        max_length=20,
        choices=ModerationStatusChoices.choices,
        default=ModerationStatusChoices.PENDING
    )
    last_moderated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.username
    
    def get_id(self):
        return self.id
    
    def get_avatar(self):
        return ""
    
    def get_display_name(self):
        return self.username
    
    def get_email(self):
        return self.email
    
    def get_role(self):
        return self.role
    
    def has_admin_access(self):
        return self.role == RoleChoices.ADMIN

    def update_password(self, password: str) -> None:
        self.set_password(password)
        self.save()

    def set_deleted(self) -> None:
        self.status = User.StatusChoices.DELETED
        self.save(update_fields=["status"])

    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: username, email, password, status, moderation_status, last_moderated_at"""
        allowed_fields = {
            "username", 
            "email", 
            "password", 
            "status",
            "moderation_status",
            "last_moderated_at",
        }

        # set moderation_status to PENDING
        # if any content field (username) is updated
        if "username" in metadata:
            metadata["moderation_status"] = User.ModerationStatusChoices.PENDING
        update_instance(self, allowed_fields, **metadata)

    def set_moderation_status(self, status: str) -> None:
        """
        Set both moderation_status and last_moderated_at if status is SAFE, FLAGGED or BANNED (finished moderation process).
        
        Otherwise, only set moderation_status.
        """
        if status in {
            User.ModerationStatusChoices.SAFE,
            User.ModerationStatusChoices.FLAGGED,
            User.ModerationStatusChoices.BANNED,
        }:
            self.update_metadata(
                moderation_status=status,
                last_moderated_at=timezone.now(),
            )
            return
        self.moderation_status = status
        self.save(update_fields=["moderation_status"])


class Reader(User):
    display_name: str = models.CharField(max_length=100, blank=True, default="")
    avatar: str = models.URLField(blank=True, null=True, default="")
    
    class Meta:
        verbose_name = "Reader"
        verbose_name_plural = "Readers"

    def __str__(self):
        return self.get_display_name()
   
    def get_display_name(self):
        return self.display_name if self.display_name != "" else super().get_display_name()
    
    def get_avatar(self):
        return self.avatar if self.avatar != "" else super().get_avatar()

    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: username, email, password, status, moderation_status, last_moderated_at, display_name, avatar"""
        allowed_fields = {
            "username", 
            "email", 
            "password", 
            "status", 
            "moderation_status", 
            "last_moderated_at",
            "display_name", 
            "avatar", 
        }

        # set moderation_status to PENDING
        # if any content field (username, display_name, avatar) is updated
        content_fields = {"username", "display_name", "avatar"}
        if any(field in content_fields for field in metadata.keys()):
            metadata["moderation_status"] = Reader.ModerationStatusChoices.PENDING
            
        update_instance(self, allowed_fields, **metadata)

    """ Comment Management """
    def post_comment(
        self, text: Optional[str] = None,
        attached_image_url: Optional[str] = None,
        parent_comment: Optional["Comment"] = None, 
        manga_title: Optional["MangaTitle"] = None, 
        chapter: Optional["Chapter"] = None
    ) -> "Comment":
        from .manga_models import Comment
        
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
    
    """ Subscription Management """
    def get_subscription(self) -> "ReaderSubscription":
        from .subscription_models import ReaderSubscription
        return ReaderSubscription.objects.get(reader_id=self.id)
    
    def is_subscription_active(self) -> bool:
        subscription = self.get_subscription()
        return subscription.is_active()

    def has_subscription_feature_access(self, feature: str) -> bool:
        subscription = self.get_subscription()
        return (subscription.is_active()
            and subscription.has_access(feature))

    """ Report Management """
    def post_report(
        self, content: str, target_content_type: str, 
        target_content_id: uuid.UUID
    ) -> "Report":
        from .system_models import Report
        
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