from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from ..models.community_models import Comment
from ..services.system_service import SystemService


@receiver(post_save, sender=Comment)
def log_comment_save(sender, instance: Comment, created: bool, **kwargs):
    SystemService.log_object_save(instance, created)

@receiver(post_delete, sender=Comment)
def log_comment_delete(sender, instance: Comment, **kwargs):
    SystemService.log_object_delete(instance)