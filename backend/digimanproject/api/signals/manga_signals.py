from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author, Comment
from ..services.system_service import LogEntryService


@receiver(post_save, sender=MangaTitle)
def log_manga_title_save(sender, instance: MangaTitle, created: bool, **kwargs):
    LogEntryService.log_object_save(instance, created)

@receiver(post_delete, sender=MangaTitle)
def log_manga_title_delete(sender, instance: MangaTitle, **kwargs):
    LogEntryService.log_object_delete(instance)

@receiver(post_save, sender=Chapter)
def log_chapter_save(sender, instance: Chapter, created: bool, **kwargs):
    LogEntryService.log_object_save(instance, created)

@receiver(post_delete, sender=Chapter)
def log_chapter_delete(sender, instance: Chapter, **kwargs):
    LogEntryService.log_object_delete(instance)

@receiver(post_save, sender=Page)
def log_page_save(sender, instance: Page, created: bool, **kwargs):
    LogEntryService.log_object_save(instance, created)

@receiver(post_delete, sender=Page)
def log_page_delete(sender, instance: Page, **kwargs):
    LogEntryService.log_object_delete(instance)

@receiver(post_save, sender=Genre)
def log_genre_save(sender, instance: Genre, created: bool, **kwargs):
    LogEntryService.log_object_save(instance, created)

@receiver(post_delete, sender=Genre)
def log_genre_delete(sender, instance: Genre, **kwargs):
    LogEntryService.log_object_delete(instance)

@receiver(post_save, sender=Author)
def log_author_save(sender, instance: Author, created: bool, **kwargs):
    LogEntryService.log_object_save(instance, created)

@receiver(post_delete, sender=Author)
def log_author_delete(sender, instance: Author, **kwargs):
    LogEntryService.log_object_delete(instance)

@receiver(post_save, sender=Comment)
def log_comment_save(sender, instance: Comment, created: bool, **kwargs):
    if getattr(instance, "_action_user", None) is None:
        instance._action_user = instance.owner
    LogEntryService.log_object_save(instance, created)

@receiver(post_delete, sender=Comment)
def log_comment_delete(sender, instance: Comment, **kwargs):
    if getattr(instance, "_action_user", None) is None:
        instance._action_user = instance.owner
    LogEntryService.log_object_delete(instance)
    