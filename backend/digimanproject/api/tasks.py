from celery import shared_task
from .services.ai_moderation_service import AIModerationService
from django.core.cache import cache

STATUS_KEY = "moderation:status"

@shared_task(bind=True)
def run_moderation_pipeline_task(self):
    try:
        cache.set(STATUS_KEY, "running", timeout=3600)  # for 1 hour
        AIModerationService.run_moderation_pipeline()
        cache.set(STATUS_KEY, "completed", timeout=300)  # for 5 minutes
    except Exception:
        cache.set(STATUS_KEY, "failed", timeout=300)
        raise