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
    from .reader_models import ReaderPreferences, LibraryList,\
        ReadingProgress, OfflineChapter
    from .community_models import Comment, Report, Notification

class User(AbstractUser):
    class RoleChoices(models.TextChoices):
        ADMIN = "admin", "Administrator"
        READER = "reader", "Reader"

    class StatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        DEACTIVATED = "deactivated", "Deactivated"
    
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    role: str = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.READER)
    status: str = models.CharField(
        max_length=20, 
        choices=StatusChoices.choices, 
        default=StatusChoices.ACTIVE)
    created_at: datetime = models.DateTimeField(
        default=timezone.now, editable=False)
    
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.username
    
    def get_display_name(self):
        return self.username

    def update_password(self, password: str) -> None:
        self.set_password(password)
        self.save(update_fields=["password"])


class Reader(User):
    display_name: str = models.CharField(max_length=100, blank=True, default="")
    avatar: str = models.URLField(blank=True, null=True, default="")
    age: Optional[int] = models.PositiveIntegerField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Reader"
        verbose_name_plural = "Readers"

    def __str__(self):
        return self.get_display_name()
    
    def get_display_name(self):
        return self.display_name if self.display_name != "" else self.username
    
    # Library List Management
    def get_library_lists(self) -> models.QuerySet["LibraryList"]:
        from .reader_models import LibraryList
        lists: models.Manager["LibraryList"] = self.library_lists
        return lists.filter(visibility_in=[
            LibraryList.VisibilityChoices.PUBLIC,
            LibraryList.VisibilityChoices.PRIVATE
        ])
    
    def get_built_in_library_lists(self) -> models.QuerySet["LibraryList"]:
        from .reader_models import LibraryList

        existing_names = set(
            LibraryList.objects.filter(
                reader=self,
                visibility=LibraryList.VisibilityChoices.BUILTIN
            ).values_list("name", flat=True)
        )

        missing = [n for n in LibraryList.BuiltInListNames.values() \
                    if n not in existing_names]
        if missing:
            LibraryList.objects.bulk_create([
                LibraryList(
                    reader=self,
                    name=n, 
                    visibility=LibraryList.VisibilityChoices.BUILTIN
                ) for n in missing
            ])

        return LibraryList.objects.filter(
            reader=self, visibility=LibraryList.VisibilityChoices.BUILTIN)
    
    def get_public_library_lists(self) -> models.QuerySet["LibraryList"]:
        from .reader_models import LibraryList
        lists: models.Manager["LibraryList"] = self.library_lists
        return lists.filter(visibility=LibraryList.VisibilityChoices.PUBLIC)
    
    def create_library_list(self, name: str, visibility: str) -> "LibraryList":
        from .reader_models import LibraryList
        return LibraryList.objects.create(
            reader=self, name=name, visibility=visibility)
    
    def update_library_list(
        self, library_list: "LibraryList", **metadata: Any
    ) -> None:
        """Allowed fields: name, visibility"""
        library_list.update_metadata(**metadata)

    def delete_library_list(self, library_list: "LibraryList") -> bool:
        deleted, _ = library_list.delete()
        return deleted > 0

    # Preferences Management
    def get_preferences(self) -> "ReaderPreferences":
        from .reader_models import ReaderPreferences
        prefs, _ = ReaderPreferences.objects.get_or_create(reader=self)
        return prefs
    
    def update_preferences(self, **preferences_data: Any) -> None:
        """Allowed fields: theme_mode, page_display_style, 
        reading_direction, image_size_mode, is_progress_bar_visible"""
        prefs = self.get_preferences()
        prefs.update_preferences(**preferences_data)

    # Reading History Management
    def get_reading_history(self) -> models.QuerySet["ReadingProgress"]:
        history: models.Manager[ReadingProgress] = self.reading_progress
        return history.all()
    
    def add_reading_progress(self, chapter: Chapter) -> "ReadingProgress":
        from .reader_models import ReadingProgress
        return ReadingProgress.objects.create(reader=self, chapter=chapter)
    
    def remove_reading_progress(self, reading_progress: "ReadingProgress") -> None:
        reading_progress.delete()
    
    # Offline Chapter Management
    def get_offline_chapters(self) -> models.QuerySet["OfflineChapter"]:
        chapters: models.Manager["OfflineChapter"] = self.offline_chapters
        return chapters.all()
    
    def add_offline_chapter(
        self, chapter: "Chapter", **other_data: Any
    ) -> "OfflineChapter":
        from .reader_models import OfflineChapter
        return OfflineChapter.objects.create(
            reader=self, chapter=chapter, **other_data
        )
    
    def remove_offline_chapter(self, offline_chapter: "OfflineChapter") -> None:
        offline_chapter.delete()

    # Comment Management
    def post_comment(
        self, content: str, is_image: bool = False, 
        parent_comment: Optional["Comment"] = None, 
        manga_title: Optional["MangaTitle"] = None, 
        chapter: Optional["Chapter"] = None
    ) -> "Comment":
        from .community_models import Comment
        
        if (manga_title is None and chapter is None) \
            or (manga_title is not None and chapter is not None):
            raise ValueError("Either manga_title or chapter must be provided")
        
        new_comment = Comment(
            owner=self, content=content, is_image=is_image, 
            parent_comment=parent_comment, 
            manga_title=manga_title, chapter=chapter
        )
        new_comment.clean()
        return Comment.objects.create(new_comment)

    def update_comment_text_only(self, comment: "Comment", content: str) -> None:
        comment.update_content(content=content)

    def delete_comment(self, comment: "Comment") -> None:
        comment.set_deleted()

    # Other Methods
    def view_catalog(self) -> models.QuerySet["MangaTitle"]:
        from .manga_models import MangaTitle
        return MangaTitle.objects.filter(is_visible=True)
    
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