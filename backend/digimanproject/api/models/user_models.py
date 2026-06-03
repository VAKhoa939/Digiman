from __future__ import annotations
from typing import Any
from datetime import datetime
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

import uuid
from .common_choice_classes import ModerationStatusChoices
from ..utils.helper_functions import update_instance, remove_unchanged_and_denied_fields

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
        default=ModerationStatusChoices.SAFE
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

    def update_metadata(self, **metadata: Any) -> bool:
        """Allowed fields: username, email, password, status, moderation_status, last_moderated_at"""
        allowed_fields = {
            "username", 
            "email", 
            "password", 
            "status",
            "moderation_status",
            "last_moderated_at",
        }
        print("metadata: ", metadata)
        print("old data: ", self.__dict__)
        metadata = remove_unchanged_and_denied_fields(self, allowed_fields, **metadata)
        print("metadata: ", metadata)
        # set moderation_status to PENDING
        # if any content field (username) is updated
        if "username" in metadata:
            metadata["moderation_status"] = ModerationStatusChoices.PENDING

        return update_instance(self, **metadata)

    def set_moderation_status(self, status: str) -> None:
        """
        Set both moderation_status and last_moderated_at if status is SAFE, FLAGGED or BANNED (finished moderation process).
        
        Otherwise, only set moderation_status.
        """
        if status in {
            ModerationStatusChoices.SAFE,
            ModerationStatusChoices.FLAGGED,
            ModerationStatusChoices.BANNED,
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

    def update_metadata(self, **metadata: Any) -> bool:
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
        print("metadata: ", metadata)
        print("old data: ", self.__dict__)
        metadata = remove_unchanged_and_denied_fields(self, allowed_fields, **metadata)
        print("metadata: ", metadata)
        # set moderation_status to PENDING
        # if any content field (username, display_name, avatar) is updated
        content_fields = {"username", "display_name", "avatar"}
        if any(field in content_fields for field in metadata.keys()):
            metadata["moderation_status"] = ModerationStatusChoices.PENDING
            
        return update_instance(self, **metadata)
    
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


class Administrator(Reader):
    
    class Meta:
        verbose_name = "Admin"
        verbose_name_plural = "Admins"