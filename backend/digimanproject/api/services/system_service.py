from django.db import transaction
from ..models.user_models import User, Reader
from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author
from ..models.community_models import Comment
from ..models.system_models import Announcement, LogEntry, FlaggedContent, LogEntryTargetObjectType

from typing import Union, Any

TypesInModeration = Union[User, MangaTitle, Chapter, Page, Genre, Author, Comment]

ActionTypeChoices = LogEntry.ActionTypeChoices

class LogEntryDetailFactory:
    @staticmethod
    def get_moderation_detail(target_object: TypesInModeration) -> dict[str, Any]:
        if isinstance(target_object, Reader):
            return {
                'targetType': 'user', 
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
                'targetType': 'user', 
                'attributes' : [
                    {"attributeName": "username",
                        "isImage": "False",
                        "content": target_object.username},
                ],
            }
        elif isinstance(target_object, MangaTitle):
            return {
                'targetType': 'manga', 
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
                'targetType': 'chapter', 
                'attributes' : [
                    {"attributeName": "title",
                        "isImage": "False",
                        "content": target_object.title},
                ],
            }
        elif isinstance(target_object, Page):
            return {
                'targetType': 'page', 
                'attributes' : [
                    {"attributeName": "imageUrl",
                        "isImage": "True",
                        "content": target_object.image_url},
                ],
            }
        elif isinstance(target_object, Genre):
            return {
                'targetType': 'genre', 
                'attributes' : [
                    {"attributeName": "name",
                        "isImage": "False",
                        "content": target_object.name},
                ],
            }
        elif isinstance(target_object, Author):
            return {
                'targetType': 'author', 
                'attributes' : [
                    {"attributeName": "name",
                        "isImage": "False",
                        "content": target_object.name},
                ],
            }
        elif isinstance(target_object, Comment):
            return {
                'targetType': 'comment', 
                'attributes' : [
                    {"attributeName": "content",
                        "isImage": str(target_object.is_image),
                        "content": target_object.content},
                ],
            }
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
            action_type in {ActionTypeChoices.CREATE, ActionTypeChoices.UPDATE}
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
            SystemService.create_log_entry(user, ActionTypeChoices.CREATE, instance)
        else:
            SystemService.create_log_entry(user, ActionTypeChoices.UPDATE, instance)
    
    @staticmethod
    def log_object_delete(instance: LogEntryTargetObjectType):
        user = getattr(instance, "_action_user", None)
        SystemService.create_log_entry(user, ActionTypeChoices.DELETE, instance)

    @staticmethod
    def log_login(user: User):
        SystemService.create_log_entry(user, ActionTypeChoices.LOGIN, user)
    
    @staticmethod
    def log_logout(user: User):
        SystemService.create_log_entry(user, ActionTypeChoices.LOGOUT, user)