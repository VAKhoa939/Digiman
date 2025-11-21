from django.db import transaction

from api.utils.helper_functions import get_dominant_attribute_and_score
from ..models.user_models import User, Reader
from ..models.manga_models import MangaTitle, Chapter, Page
from ..models.community_models import Comment
from ..models.system_models import Announcement, LogEntry, FlaggedContent, LogEntryTargetObjectType

from typing import Any, Dict

TypesInModeration = (User, Reader, MangaTitle, Chapter, Page, Comment)

class LogEntryDetailFactory:
    @staticmethod
    def get_moderation_detail(target_object) -> dict[str, Any]:
        if isinstance(target_object, Reader):
            return {
                'targetType': FlaggedContent.TargetContentTypeChoices.USER.value, 
                'attributes' : [
                    {"attributeName": "username",
                        "isImage": "False",
                        "content": target_object.username},
                    {"attributeName": "displayName",
                        "isImage": "False",
                        "content": target_object.display_name},
                    {"attributeName": "avatar",
                        "isImage": "True",
                        "content": target_object.avatar},
                ],
            }
        elif isinstance(target_object, User):
            return {
                'targetType': FlaggedContent.TargetContentTypeChoices.USER.value, 
                'attributes' : [
                    {"attributeName": "username",
                        "isImage": "False",
                        "content": target_object.username},
                ],
            }
        elif isinstance(target_object, MangaTitle):
            return {
                'targetType': FlaggedContent.TargetContentTypeChoices.MANGA_TITLE.value, 
                'attributes' : [
                    {"attributeName": "title",
                        "isImage": "False",
                        "content": target_object.title},
                    {"attributeName": "alternativeTitle",
                        "isImage": "False",
                        "content": target_object.alternative_title},
                    {"attributeName": "description",
                        "isImage": "False",
                        "content": target_object.description},
                    {"attributeName": "coverImage",
                        "isImage": "True",
                        "content": target_object.cover_image},
                ],
            }
        elif isinstance(target_object, Chapter):
            return {
                'targetType': FlaggedContent.TargetContentTypeChoices.CHAPTER.value, 
                'attributes' : [
                    {"attributeName": "title",
                        "isImage": "False",
                        "content": target_object.title},
                ],
            }
        elif isinstance(target_object, Page):
            return {
                'targetType': FlaggedContent.TargetContentTypeChoices.PAGE.value, 
                'attributes' : [
                    {"attributeName": "imageUrl",
                        "isImage": "True",
                        "content": target_object.image_url},
                ],
            }
        elif isinstance(target_object, Comment):
            details = {
                'targetType': FlaggedContent.TargetContentTypeChoices.COMMENT.value, 
                'attributes': [],
            }
            if target_object.text:
                details['attributes'].append({
                    "attributeName": "text",
                    "isImage": "False",
                    "content": target_object.text,
                })
            if target_object.attached_image_url:
                details['attributes'].append({
                    "attributeName": "attachedImageUrl",
                    "isImage": "True",
                    "content": target_object.attached_image_url,
                })
            return details
        else:
            return {}
        

class SystemService:
    @staticmethod
    @transaction.atomic
    def create_log_entry(
        user: User, action_type: str, target_object: LogEntryTargetObjectType
    ) -> LogEntry:
        """
        Creates a new log entry for a specific action (including: create, update, delete, login, logout).

        If the target object's type is in moderation, the details will be updated.
        """
        details: dict[str, Any] = {}
        if (
            action_type in {LogEntry.ActionTypeChoices.CREATE, LogEntry.ActionTypeChoices.UPDATE}
            and isinstance(target_object, TypesInModeration)
        ):
            details = LogEntryDetailFactory.get_moderation_detail(target_object)
            
        return LogEntry.objects.create(
            user=user,
            action_type=action_type,
            target_object_type=target_object._meta.model_name,
            target_object_id=target_object.id,
            details=details,
            is_moderated=not bool(details),
        )
    
    @staticmethod
    def log_object_save(instance: LogEntryTargetObjectType, created: bool):
        user = getattr(instance, "_action_user", None)
        if created:
            SystemService.create_log_entry(user, LogEntry.ActionTypeChoices.CREATE, instance)
        else:
            SystemService.create_log_entry(user, LogEntry.ActionTypeChoices.UPDATE, instance)
    
    @staticmethod
    def log_object_delete(instance: LogEntryTargetObjectType):
        user = getattr(instance, "_action_user", None)
        SystemService.create_log_entry(user, LogEntry.ActionTypeChoices.DELETE, instance)

    @staticmethod
    def log_login(user: User):
        SystemService.create_log_entry(user, LogEntry.ActionTypeChoices.LOGIN, user)
    
    @staticmethod
    def log_logout(user: User):
        SystemService.create_log_entry(user, LogEntry.ActionTypeChoices.LOGOUT, user)

    @staticmethod
    @transaction.atomic
    def create_flag(
        log_entry: LogEntry, content_name: str, content: str, 
        is_image: bool, result: dict[str, float], reason: str
    ):
        """
        Creates a new flagged content.
        Including: marks older flags as resolved, computes severity, 
        creates a new one, and logs the event.
        """
        # 1. Mark older flags as resolved
        old_flags = FlaggedContent.objects.filter(
            target_content_type=log_entry.target_object_type,
            target_content_id=log_entry.target_object_id,
            content_name=content_name,
            is_resolved=False
        )
        if old_flags.exists():
            for flag in old_flags:
                flag.resolve()
                SystemService.create_log_entry(
                    None,
                    LogEntry.ActionTypeChoices.AUTO_RESOLVE_FLAG,
                    flag
                )

        # 2. Compute severity
        dominant_attribute, severity_score = get_dominant_attribute_and_score(result)

        # 3. Create new flagged content
        obj = FlaggedContent.objects.create(
            target_content_type=log_entry.target_object_type,
            target_content_id=log_entry.target_object_id,
            content_name=content_name,
            content=content,
            severity_score=severity_score,
            dominant_attribute=dominant_attribute,
            reason=reason,
            details=result,
            is_content_image=is_image,
        )

        SystemService.create_log_entry(
            None,
            LogEntry.ActionTypeChoices.CREATE,
            obj
        )

        return obj
    