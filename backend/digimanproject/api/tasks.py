from celery import shared_task
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded
from .services.ai_moderation_service import AIModerationService, ModerationCleanupService
from uuid import UUID

@shared_task(
    bind=True, 
    max_retries=3,
    soft_time_limit=60,
    time_limit=90
)
def run_moderation_pipeline_task(self, entry_id: UUID):
    try:
        AIModerationService.run_moderation_pipeline(entry_id)
    except SoftTimeLimitExceeded:
        AIModerationService.set_moderation_failed_attempt(entry_id, "Moderation pipeline failed due to exceeded time limit", is_failed_permanently=True)
    except Exception as exc:
        try:
            raise self.retry(exc=exc, countdown=20)
        except MaxRetriesExceededError:
            AIModerationService.set_moderation_failed_attempt(entry_id, "Moderation pipeline failed due to retries exceeded. Last attempt error: " + str(exc))
            raise

@shared_task
def cleanup_stuck_moderation_tasks_task():
    return ModerationCleanupService.cleanup_stuck_moderation_tasks()

def enqueue_moderation_task(entry_id: UUID):
    try:
        run_moderation_pipeline_task.delay(str(entry_id))
    except Exception as e:
        AIModerationService.set_moderation_failed_attempt(entry_id, str(e), is_failed_permanently=True)
