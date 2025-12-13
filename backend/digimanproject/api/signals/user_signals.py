from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from ..models.user_models import User
from ..services.system_service import SystemService


@receiver(post_save, sender=User)
def log_user_save(sender, instance: User, created: bool, **kwargs):
    if getattr(instance, "_skip_logging", True):
        return
    if getattr(instance, "_action_user", None) is None:
        instance._action_user = instance
    SystemService.log_object_save(instance, created)


@receiver(post_delete, sender=User)
def log_user_delete(sender, instance: User, **kwargs):
    if getattr(instance, "_action_user", None) is None:
        instance._action_user = instance
    SystemService.log_object_delete(instance)


@receiver(pre_save, sender=User)
def detect_internal_user_update(sender, instance, **kwargs):
    """
    Detect Django-internal user updates such as last_login changes
    and mark them to skip logging.
    """
    if not instance.pk:
        return  # new object, not update

    try:
        old = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    # changed fields detection
    changed_fields = []
    for field in instance._meta.fields:
        field_name = field.name
        if getattr(old, field_name) != getattr(instance, field_name):
            changed_fields.append(field_name)

    # If ONLY last_login changed → skip logging
    if changed_fields == ["last_login"]:
        instance._skip_logging = True