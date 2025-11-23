from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author
from ..services.system_service import SystemService


@receiver(post_save, sender=MangaTitle)
def log_manga_title_save(sender, instance: MangaTitle, created: bool, **kwargs):
    SystemService.log_object_save(instance, created)

@receiver(post_delete, sender=MangaTitle)
def log_manga_title_delete(sender, instance: MangaTitle, **kwargs):
    SystemService.log_object_delete(instance)

@receiver(post_save, sender=Chapter)
def log_chapter_save(sender, instance: Chapter, created: bool, **kwargs):
    SystemService.log_object_save(instance, created)

@receiver(post_delete, sender=Chapter)
def log_chapter_delete(sender, instance: Chapter, **kwargs):
    SystemService.log_object_delete(instance)

@receiver(post_save, sender=Page)
def log_page_save(sender, instance: Page, created: bool, **kwargs):
    SystemService.log_object_save(instance, created)

@receiver(post_delete, sender=Page)
def log_page_delete(sender, instance: Page, **kwargs):
    SystemService.log_object_delete(instance)

@receiver(post_save, sender=Genre)
def log_genre_save(sender, instance: Genre, created: bool, **kwargs):
    SystemService.log_object_save(instance, created)

@receiver(post_delete, sender=Genre)
def log_genre_delete(sender, instance: Genre, **kwargs):
    SystemService.log_object_delete(instance)

@receiver(post_save, sender=Author)
def log_author_save(sender, instance: Author, created: bool, **kwargs):
    SystemService.log_object_save(instance, created)

@receiver(post_delete, sender=Author)
def log_author_delete(sender, instance: Author, **kwargs):
    SystemService.log_object_delete(instance)
