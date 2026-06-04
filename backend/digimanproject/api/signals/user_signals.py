from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from ..models.user_models import User
from ..services.system_service import LogEntryService


@receiver(post_delete, sender=User)
def log_user_delete(sender, instance: User, **kwargs):
    if getattr(instance, "_action_user", None) is None:
        instance._action_user = instance
    LogEntryService.log_object_delete(instance)
    