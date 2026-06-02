from celery import shared_task
from .services.ai_moderation_service import AIModerationService
from uuid import UUID

@shared_task(bind=True, max_retries=3)
def run_moderation_pipeline_task(self, entry_id: UUID):
    try:
        AIModerationService.run_moderation_pipeline(entry_id)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=20)