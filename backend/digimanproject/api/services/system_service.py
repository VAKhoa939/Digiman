import uuid
from django.db import transaction

from ..models.user_models import User, Reader, Administrator
from ..models.manga_models import MangaTitle, Chapter, Page
from ..models.community_models import Comment
from ..models.system_models import Announcement, LogEntry, FlaggedContent, LogEntryTargetObjectType

from ..utils.helper_functions import cast_user_to_subclass

from typing import Any, Dict, Optional

TypesInModeration = (
    User, Reader, Administrator, MangaTitle, Chapter, Page, Comment
)

class LogEntryDetailFactory:
    @staticmethod
    def get_moderation_detail(target_object) -> Dict[str, Any]:
        if isinstance(target_object, User):
            casted_user = cast_user_to_subclass(target_object)
            if isinstance(casted_user, (Reader, Administrator)):
                return {
                    'targetType': FlaggedContent.TargetObjectTypeChoices.USER.value, 
                    'attributes' : [
                        {"attributeName": "username",
                            "isImage": "False",
                            "content": casted_user.username},
                        {"attributeName": "displayName",
                            "isImage": "False",
                            "content": casted_user.display_name},
                        {"attributeName": "avatar",
                            "isImage": "True",
                            "content": casted_user.avatar},
                    ],
                }
            # If the target object is not a Reader or Administrator, make a generic User detail
            return {
                'targetType': FlaggedContent.TargetObjectTypeChoices.USER.value, 
                'attributes' : [
                    {"attributeName": "username",
                        "isImage": "False",
                        "content": casted_user.username},
                ],
            }
        elif isinstance(target_object, MangaTitle):
            return {
                'targetType': FlaggedContent.TargetObjectTypeChoices.MANGA_TITLE.value, 
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
                'targetType': FlaggedContent.TargetObjectTypeChoices.CHAPTER.value, 
                'attributes' : [
                    {"attributeName": "title",
                        "isImage": "False",
                        "content": target_object.title},
                ],
            }
        elif isinstance(target_object, Page):
            return {
                'targetType': FlaggedContent.TargetObjectTypeChoices.PAGE.value, 
                'attributes' : [
                    {"attributeName": "imageUrl",
                        "isImage": "True",
                        "content": target_object.image_url},
                ],
            }
        elif (isinstance(target_object, Comment) 
              and target_object.status != Comment.StatusChoices.DELETED):
            details = {
                'targetType': FlaggedContent.TargetObjectTypeChoices.COMMENT.value, 
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

    # ------------------------------ Log Entry ------------------------------
    
    @staticmethod
    @transaction.atomic
    def create_log_entry(
        user: Optional[User], action_type: str, target_object: LogEntryTargetObjectType
    ) -> LogEntry:
        """
        Creates a new log entry for a specific action (including: create, update, delete, login, logout).

        If the target object's type is in moderation, the details will be updated.

        For moderating FlaggedContent objects after resolving, the old target object will be used.
        """
        details: Dict[str, Any] = {}
        
        if (
            isinstance(target_object, FlaggedContent) 
            and action_type == LogEntry.ActionTypeChoices.RESOLVE_FLAG
        ):
            target_object = target_object.get_target_object()

        if (
            action_type in {
                LogEntry.ActionTypeChoices.CREATE, 
                LogEntry.ActionTypeChoices.UPDATE,
                LogEntry.ActionTypeChoices.RESOLVE_FLAG,
            }
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


    # ------------------------------ Flagged Content ------------------------------

    @staticmethod
    @transaction.atomic
    def create_flag(
        log_entry: LogEntry, content_name: str, content: str, 
        is_image: bool, result: Dict[str, float], reason: str,
        dominant_attribute: str, severity_score: float
    ):
        """
        Creates a new flagged content.
        """
        obj = FlaggedContent.objects.create(
            severity_score=severity_score,
            dominant_attribute=dominant_attribute,
            reason=reason,
            details=result,
            content_name=content_name,
            content=content,
            is_content_image=is_image,
            target_object_type=log_entry.target_object_type,
            target_object_id=log_entry.target_object_id,
        )

        SystemService.create_log_entry(
            None,
            LogEntry.ActionTypeChoices.CREATE,
            obj
        )

        return obj
    
    @staticmethod
    @transaction.atomic
    def resolve_flag(flag: FlaggedContent, action_type: LogEntry.ActionTypeChoices):
        flag.resolve()
        SystemService.create_log_entry(None, action_type, flag)

    @staticmethod
    def resolve_old_flags(
        target_object_type: LogEntry.TargetObjectTypeChoices,
        target_object_id: uuid.UUID,
        content_name: str
    ):
        """
        Resolves all old flags for a specific target object's content.
        """
        old_flags = FlaggedContent.objects.filter(
            target_object_type=target_object_type,
            target_object_id=target_object_id,
            content_name=content_name,
            is_resolved=False
        )
        if not old_flags.exists():
            return
        for flag in old_flags:
            SystemService.resolve_flag(flag, LogEntry.ActionTypeChoices.AUTO_RESOLVE_FLAG)
    
    @staticmethod
    def get_flagged_content_index(flagged_content: FlaggedContent) -> int:
        return FlaggedContent.objects.filter(
            flagged_at__lte=flagged_content.flagged_at
        ).count()