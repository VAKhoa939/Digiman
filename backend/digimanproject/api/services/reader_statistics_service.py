from __future__ import annotations

import logging
import uuid
from typing import Tuple

from django.db import transaction
from django.db.models import Avg
from django.utils import timezone

from ..models.reader_models import MangaReaderStatistics, ReadingProgress

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..models.manga_models import Chapter

logger = logging.getLogger(__name__)


class ReaderStatisticsService:

    # ------------------------------------------------------------------
    # Internal helper
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def get_or_create_stats(
        reader_id: uuid.UUID, manga_title_id: uuid.UUID
    ) -> MangaReaderStatistics:
        stats, _ = MangaReaderStatistics.objects.get_or_create(
            reader_id=reader_id,
            manga_title_id=manga_title_id,
        )
        return stats

    # ------------------------------------------------------------------
    # Flag updates
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def mark_visited(
        reader_id: uuid.UUID, manga_title_id: uuid.UUID
    ) -> MangaReaderStatistics:
        """Set is_reader_visited = True (no-op if already set)."""
        stats = ReaderStatisticsService.get_or_create_stats(reader_id, manga_title_id)
        if not stats.is_reader_visited:
            stats.is_reader_visited = True
            stats.save(update_fields=["is_reader_visited"])
        return stats

    @staticmethod
    @transaction.atomic
    def mark_read(
        reader_id: uuid.UUID, manga_title_id: uuid.UUID
    ) -> MangaReaderStatistics:
        """Set is_reader_read = True (no-op if already set)."""
        stats = ReaderStatisticsService.get_or_create_stats(reader_id, manga_title_id)
        if not stats.is_reader_read:
            stats.is_reader_read = True
            stats.save(update_fields=["is_reader_read"])
        return stats

    @staticmethod
    @transaction.atomic
    def mark_commented(
        reader_id: uuid.UUID, manga_title_id: uuid.UUID
    ) -> MangaReaderStatistics:
        """Set is_reader_commented = True (no-op if already set)."""
        stats = ReaderStatisticsService.get_or_create_stats(reader_id, manga_title_id)
        if not stats.is_reader_commented:
            stats.is_reader_commented = True
            stats.save(update_fields=["is_reader_commented"])
        return stats

    # ------------------------------------------------------------------
    # Star rating
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def set_star_rating(
        reader_id: uuid.UUID, manga_title_id: uuid.UUID, rating: int
    ) -> MangaReaderStatistics:
        """Set the reader's personal star rating (1–5)."""
        if not 1 <= rating <= 5:
            raise ValueError("Rating must be between 1 and 5.")
        stats = ReaderStatisticsService.get_or_create_stats(reader_id, manga_title_id)
        stats.star_rating = rating
        stats.save(update_fields=["star_rating"])
        return stats

    # ------------------------------------------------------------------
    # Aggregates (across all readers, used by manga serializer)
    # ------------------------------------------------------------------

    @staticmethod
    def get_average_rating(manga_title_id: uuid.UUID) -> float:
        """Average star_rating from all readers who rated (star_rating > 0)."""
        result = MangaReaderStatistics.objects.filter(
            manga_title_id=manga_title_id, star_rating__gt=0
        ).aggregate(avg=Avg("star_rating"))
        avg = result.get("avg")
        return round(float(avg), 1) if avg is not None else 0.0

    @staticmethod
    def get_read_count(manga_title_id: uuid.UUID) -> int:
        """Number of distinct readers who have read this manga."""
        return MangaReaderStatistics.objects.filter(
            manga_title_id=manga_title_id, is_reader_read=True
        ).count()

    # ------------------------------------------------------------------
    # Reading progress
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def upsert_reading_progress(
        reader_id: uuid.UUID, chapter: "Chapter"
    ) -> Tuple[ReadingProgress, bool]:
        """Create or update a ReadingProgress entry for (reader, chapter).

        The post_save signal on ReadingProgress handles updating
        MangaReaderStatistics flags automatically when created=True.
        Returns (progress, created).
        """
        progress, created = ReadingProgress.objects.update_or_create(
            reader_id=reader_id,
            chapter=chapter,
            defaults={"last_read_timestamp": timezone.now()},
        )
        return progress, created
