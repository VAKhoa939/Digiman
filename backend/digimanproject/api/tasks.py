from celery import shared_task
from .services.ai_moderation_service import AIModerationService
from django.core.cache import cache

@shared_task
def run_moderation_pipeline_task():
    AIModerationService.run_moderation_pipeline()
    cache.set("moderation_completed", True, timeout=300)  # for 1 minute