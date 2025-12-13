from celery import shared_task
from .services.ai_moderation_service import AIModerationService
from django.core.cache import cache

@shared_task(bind=True)
def run_moderation_pipeline_task(self):
    try:
        cache.set("moderation:running", True, timeout=3600)  # for 1 hour
        AIModerationService.run_moderation_pipeline()
        cache.set("moderation:completed", True, timeout=300)  # for 5 minute
    finally:
        cache.delete("moderation:running")