from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from ..models.subscription_models import SubscriptionPlan
from ..services.system_service import LogEntryService


@receiver(post_save, sender=SubscriptionPlan)
def log_subscription_plan_save(sender, instance: SubscriptionPlan, created: bool, **kwargs):
    LogEntryService.log_object_save(instance, created)

@receiver(post_delete, sender=SubscriptionPlan)
def log_subscription_plan_delete(sender, instance: SubscriptionPlan, **kwargs):
    LogEntryService.log_object_delete(instance)