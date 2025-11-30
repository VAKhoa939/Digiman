from __future__ import annotations
from typing import Any, Optional
from datetime import datetime
from django.db import models
from django.utils import timezone

import uuid
from ..utils.helper_functions import update_instance

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .manga_models import MangaTitle, Chapter
    from .user_models import Reader

class ReaderPreferences(models.Model):
    class ThemeModeChoices(models.TextChoices):
        LIGHT = "light", "Light"
        DARK = "dark", "Dark"

    class PageDisplayStyleChoices(models.TextChoices):
        SINGLE_PAGE = "single-page", "Single-Page"
        DOUBLE_PAGE = "double-page", "Double-Page"
        LONG_STRIP = "long_strip", "Long Strip"
        WIDE_STRIP = "wide_strip", "Wide Strip"

    class ReadingDirectionChoices(models.TextChoices):
        LEFT_TO_RIGHT = "left_to_right", "Left to Right"
        RIGHT_TO_LEFT = "right_to_left", "Right to Left"

    class ImageSizeModeChoices(models.TextChoices):
        FIT_WIDTH = "fit_width", "Fit Width"
        FIT_HEIGHT = "fit_height", "Fit Height"
        FIT_BOTH = "fit_both", "Fit Both"

    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    reader: "Reader" = models.OneToOneField(
        "Reader", on_delete=models.CASCADE, related_name="preferences")
    theme_mode: str = models.CharField(
        choices=ThemeModeChoices.choices,
        default=ThemeModeChoices.LIGHT)
    page_display_style: str = models.CharField(
        choices=PageDisplayStyleChoices.choices,
        default=PageDisplayStyleChoices.SINGLE_PAGE)
    reading_direction: str = models.CharField(
        choices=ReadingDirectionChoices.choices,
        default=ReadingDirectionChoices.LEFT_TO_RIGHT)
    image_size_mode: str = models.CharField(
        choices=ImageSizeModeChoices.choices,
        default=ImageSizeModeChoices.FIT_BOTH)
    is_progress_bar_visible: bool = models.BooleanField(default=True)
    
    def update_preferences(self, **preferences_data: Any) -> None:
        """Allowed fields: theme_mode, page_display_style, 
        reading_direction, image_size_mode, is_progress_bar_visible"""
        allowed_fields = {"theme_mode", "page_display_style", 
            "reading_direction", "image_size_mode", "is_progress_bar_visible"}
        update_instance(self, allowed_fields, **preferences_data)


class LibraryList(models.Model):
    class VisibilityChoices(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"
        BUILTIN = "built-in", "Built-in"
    
    class BuiltInListNames(models.TextChoices):
        READING = "Reading", "Reading"
        PLAN_TO_READ = "Plan to Read", "Plan to Read"
        COMPLETED = "Completed", "Completed"
        ON_HOLD = "On Hold", "On Hold"
        RE_READING = "Re-reading", "Re-reading"
        DROPPED = "Dropped", "Dropped"

    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    reader: "Reader" = models.ForeignKey(
        "Reader", related_name="library_lists", on_delete=models.CASCADE)
    name: str = models.CharField(max_length=100)
    visibility: str = models.CharField(
        choices=VisibilityChoices.choices,
        default=VisibilityChoices.PRIVATE)
    created_at: datetime = models.DateTimeField(default=timezone.now)
    manga_titles: models.ManyToManyField = models.ManyToManyField(
        "MangaTitle", related_name="library_lists")

    def __str__(self) -> str:
        return f"{self.get_reader_name()}'s {self.name}"
    
    def get_reader_name(self) -> str:
        return self.reader.get_display_name()
    
    def get_manga_title_count(self) -> int:
        return self.manga_titles.count()

    def get_manga_titles(self) -> models.QuerySet["MangaTitle"]:
        return self.manga_titles.all()
    
    def update_metadata(self, **metadata) -> None:
        """Allowed fields: name, visibility"""
        allowed_fields = {"name", "visibility"}
        update_instance(self, allowed_fields, **metadata)
    
    def add_manga_title(self, manga_title: "MangaTitle") -> None:
        self.manga_titles.add(manga_title)

    def remove_manga_title(self, manga_title: "MangaTitle") -> bool:
        if self.manga_titles.filter(id=manga_title.id).exists():
            self.manga_titles.remove(manga_title)
            return True
        return False


class ReadingProgress(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    reader: "Reader" = models.ForeignKey(
        "Reader", related_name="reading_progress", on_delete=models.CASCADE)
    chapter: Optional["Chapter"] = models.ForeignKey(
        "Chapter", on_delete=models.SET_NULL, null=True)
    last_read_timestamp: datetime = models.DateTimeField(default=timezone.now)

    def get_manga_title(self) -> "MangaTitle":
        return self.chapter.get_manga_title()
    
class MangaReaderStatistics(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    reader: "Reader" = models.ForeignKey(
        "Reader", related_name="manga_reader_statistics", on_delete=models.CASCADE)
    manga_title: "MangaTitle" = models.ForeignKey(
        "MangaTitle", related_name="manga_reader_statistics", on_delete=models.CASCADE)
    is_reader_visited: bool = models.BooleanField(default=False)
    is_reader_read: bool = models.BooleanField(default=False)
    is_reader_followed: bool = models.BooleanField(default=False)
    is_reader_commented: bool = models.BooleanField(default=False)

    def update_statistics(self, **statistics_data: Any) -> None:
        """Allowed fields: is_reader_visited, is_reader_read, 
        is_reader_followed, is_reader_commented"""
        allowed_fields = {"is_reader_visited", "is_reader_read", 
            "is_reader_followed", "is_reader_commented"}
        update_instance(self, allowed_fields, **statistics_data)
