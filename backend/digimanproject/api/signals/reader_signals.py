import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from ..models.manga_models import Comment
from ..models.reader_models import ReadingProgress
from ..models.user_models import RoleChoices

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ReadingProgress)
def on_reading_progress_saved(
    sender, instance: ReadingProgress, created: bool, **kwargs
) -> None:
    """On first save of a ReadingProgress entry, automatically mark the
    reader as having visited and read the associated manga title.
    Subsequent saves (timestamp updates) are ignored."""
    if not created:
        return
    try:
        chapter = instance.chapter
        if chapter is None:
            return
        manga_title = chapter.get_manga_title()
        from ..services.reader_statistics_service import ReaderStatisticsService
        ReaderStatisticsService.mark_visited(instance.reader_id, manga_title.id)
        ReaderStatisticsService.mark_read(instance.reader_id, manga_title.id)
    except Exception:
        logger.exception(
            "Failed to update MangaReaderStatistics after ReadingProgress "
            "created (progress_id=%s)", instance.id
        )


@receiver(post_save, sender=Comment)
def on_comment_created(
    sender, instance: Comment, created: bool, **kwargs
) -> None:
    """On a new Comment by a Reader, mark is_reader_commented on the
    MangaReaderStatistics for the associated manga title."""
    if not created:
        return
    try:
        owner = instance.owner
        if owner is None or owner.role != RoleChoices.READER:
            return
        manga_title = instance.manga_title or (
            instance.chapter.manga_title if instance.chapter else None
        )
        if manga_title is None:
            return
        from ..services.reader_statistics_service import ReaderStatisticsService
        ReaderStatisticsService.mark_commented(owner.id, manga_title.id)
    except Exception:
        logger.exception(
            "Failed to update MangaReaderStatistics after Comment "
            "created (comment_id=%s)", instance.id
        )
