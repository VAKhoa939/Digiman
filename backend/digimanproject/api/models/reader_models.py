from __future__ import annotations
from typing import Any, Dict, Optional, Union
from datetime import datetime
from django.db import models
from django.utils import timezone

import uuid
from ..utils.helper_functions import get_target_object, update_instance

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .manga_models import MangaTitle, Chapter
    from .user_models import Reader
    

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
    is_reader_commented: bool = models.BooleanField(default=False)
    star_rating: int = models.IntegerField(default=0)

    def update_statistics(self, **statistics_data: Any) -> None:
        """Allowed fields: is_reader_visited, is_reader_read,
        is_reader_commented, star_rating"""
        allowed_fields = {"is_reader_visited", "is_reader_read", 
            "is_reader_commented", "star_rating"}
        update_instance(self, allowed_fields, **statistics_data)
