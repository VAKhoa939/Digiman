from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Reader, ReaderPreferences

@receiver(post_save, sender=Reader)
def create_reader_preferences(
    sender, instance: Reader, created: bool, **kwargs
) -> None:
    if created:
        ReaderPreferences.objects.create(reader=instance)