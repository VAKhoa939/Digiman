from django.db.models.signals import post_save
from django.dispatch import receiver
from ..models.user_models import Reader
from ..models.reader_models import ReaderPreferences

@receiver(post_save, sender=Reader)
def create_reader_preferences(
    sender, instance: Reader, created: bool, **kwargs
) -> None:
    if created:
        ReaderPreferences.objects.create(reader=instance)