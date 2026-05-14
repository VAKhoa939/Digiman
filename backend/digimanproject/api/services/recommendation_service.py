from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List

from django.db.models import Avg, Count, F, Q

from ..models.reader_models import ReadingProgress

logger = logging.getLogger(__name__)


class RecommendationService:
    """Business logic for content discovery and personalised recommendations."""

    # ------------------------------------------------------------------
    # Public recommendations (no auth required)
    # ------------------------------------------------------------------

    @staticmethod
    def get_recommendations(manga_id: uuid.UUID, limit: int = 10):
        """Return manga that share the same author or at least one genre
        as the given manga, ordered by read count (desc).

        The source manga is excluded from results.
        Returns an empty queryset if manga_id is not found.
        """
        from ..models.manga_models import MangaTitle

        try:
            manga = (
                MangaTitle.objects
                .prefetch_related("genres")
                .get(id=manga_id, is_visible=True)
            )
        except MangaTitle.DoesNotExist:
            return MangaTitle.objects.none()

        genre_ids = list(manga.genres.values_list("id", flat=True))
        author_id = manga.author_id

        sim_filter = Q()
        if author_id:
            sim_filter |= Q(author_id=author_id)
        if genre_ids:
            sim_filter |= Q(genres__id__in=genre_ids)

        if not sim_filter:
            return MangaTitle.objects.none()

        return (
            MangaTitle.objects
            .filter(is_visible=True)
            .exclude(id=manga_id)
            .filter(sim_filter)
            .distinct()
            .annotate(
                computed_read_count=Count(
                    "manga_reader_statistics",
                    filter=Q(manga_reader_statistics__is_reader_read=True),
                )
            )
            .select_related("author")
            .prefetch_related("genres")
            .order_by("-computed_read_count")
            [:limit]
        )

    # ------------------------------------------------------------------
    # Homepage sections (no auth required)
    # ------------------------------------------------------------------

    @staticmethod
    def get_popular(limit: int = 12):
        """Return visible manga ordered by average star rating (nulls last)."""
        from ..models.manga_models import MangaTitle

        return (
            MangaTitle.objects
            .filter(is_visible=True)
            .annotate(
                avg_star=Avg(
                    "manga_reader_statistics__star_rating",
                    filter=Q(manga_reader_statistics__star_rating__gt=0),
                )
            )
            .select_related("author")
            .prefetch_related("genres")
            .order_by(F("avg_star").desc(nulls_last=True))
            [:limit]
        )

    @staticmethod
    def get_most_read(limit: int = 12):
        """Return visible manga ordered by distinct reader count (desc)."""
        from ..models.manga_models import MangaTitle

        return (
            MangaTitle.objects
            .filter(is_visible=True)
            .annotate(
                computed_read_count=Count(
                    "manga_reader_statistics",
                    filter=Q(manga_reader_statistics__is_reader_read=True),
                )
            )
            .select_related("author")
            .prefetch_related("genres")
            .order_by("-computed_read_count")
            [:limit]
        )

    # ------------------------------------------------------------------
    # Personalised homepage banner (auth required)
    # ------------------------------------------------------------------

    @staticmethod
    def get_homepage_recommendation(reader_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Return ONE personalised recommendation banner based on the
        most recently read manga in the reader's reading history.

        Steps:
          1. Find the latest ReadingProgress entry for this reader
             (ordered by last_read_timestamp desc).
          2. Use the manga from that entry as the seed.
          3. Call get_recommendations() on the seed manga.
          4. Return a list with a single banner dict so the response
             shape stays consistent with the API contract.

        Returns an empty list if the reader has no reading history.
        """
        latest_progress = (
            ReadingProgress.objects
            .filter(reader_id=reader_id, chapter__isnull=False)
            .select_related("chapter__manga_title__author")
            .prefetch_related("chapter__manga_title__genres")
            .order_by("-last_read_timestamp")
            .first()
        )
        if latest_progress is None:
            return []

        seed_manga = latest_progress.chapter.manga_title
        if not seed_manga or not seed_manga.is_visible:
            return []

        recs = RecommendationService.get_recommendations(seed_manga.id, limit=10)
        return [
            {
                "source_manga": seed_manga,
                "recommendations": list(recs),
            }
        ]
