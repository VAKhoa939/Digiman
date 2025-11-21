from django.db import transaction
from ..models.user_models import User, Reader
from ..models.manga_models import MangaTitle, Chapter, Page
from ..models.community_models import Comment
from ..models.system_models import Announcement, LogEntry, FlaggedContent, LogEntryTargetObjectType

from typing import Any

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