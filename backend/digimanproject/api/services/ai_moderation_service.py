from django.db import transaction
import datetime
from ..models.system_models import LogEntry, FlaggedContent
from ..models.common_choice_classes import ModerationStatusChoices
from .perspective_api_service import PerspectiveAPIService
from .sightengine_service import SightengineService
from .system_service import FlaggedContentService, TypesInModeration
import logging

from uuid import UUID

logger = logging.getLogger(__name__)

from typing import Any, Dict, List

class AIModerationService:
    """
    Main AI-based moderation pipeline.
    Loads all unmoderated LogEntries, processes each attribute,
    and creates FlaggedContent objects if AI detects unsafe content.
    """

    @staticmethod
    def run_moderation_pipeline(entry_id: UUID) -> None:
        """
        Runs AI moderation pipeline in background.
        Safely processes one LogEntry at a time.
        """
        entry = LogEntry.objects.get(id=entry_id)

        if not entry or entry.get_moderation_status() != ModerationStatusChoices.PENDING:
            error_message = f"Entry id {entry_id} not found or already moderated"
            logger.error(error_message)
            raise ValueError(error_message)
        
        try:
            target_object = entry.get_target_object()
            if (not target_object 
                or not isinstance(target_object, TypesInModeration)
                or target_object.moderation_status != ModerationStatusChoices.PENDING):
                raise ValueError("Target object not found or not in moderation")
        except Exception as e:
            error_message = f"[Moderation Error] Entry {str(entry)}: {str(e)}"
            logger.error(error_message)
            entry.set_failed_moderation_attempt(error_message)
            return

        try:
            entry.set_moderation_status(ModerationStatusChoices.PROCESSING)
            target_object.set_moderation_status(ModerationStatusChoices.PROCESSING)
            logger.info(f"Moderating entry {str(entry)}")
            AIModerationService.process_log_entry(entry)
        except Exception as e:
            error_message = f"[Moderation Error] Entry {str(entry)}: {str(e)}"
            logger.error(error_message)
            AIModerationService.set_moderation_failed_attempt(entry.id, error_message)

    @staticmethod
    def process_log_entry(entry: LogEntry) -> None:
        """
        Processes a single LogEntry object.
        
        Includes: extracting attributes, running appropriate AI API service, 
        deciding if content is unsafe, and creating FlaggedContent objects.
        """
        details = entry.get_details()
        overall_moderation_status = ModerationStatusChoices.SAFE

        attrs: List[Dict[str, Any]] = details.get("attributes")
        if not attrs:
            raise ValueError("No attributes found in entry details")
        
        for attr in attrs:
            # Extract attribute fields
            if any(k not in attr for k in ["attributeName", "isImage", "content"]):
                raise ValueError("Invalid attribute format")
            content_name = attr.get("attributeName")
            is_image = str(attr.get("isImage")).lower() == "true"
            content = attr.get("content")

            # Run the appropriate AI moderation
            if is_image:
                api_service_results = SightengineService.call_service(content)
            else:
                api_service_results = PerspectiveAPIService.call_service(content)
            result, is_flagged, is_banned, reason, dominant_attribute, severity_score = api_service_results

            # Resolve old flags for this content
            FlaggedContentService.resolve_old_flags(entry.target_object_type, entry.target_object_id, content_name)
            
            # Decide if content is unsafe to start creating flagged content object
            if not is_flagged and not is_banned:
                continue # Content is safe, continue to next attribute
            if is_banned:
                moderation_status = FlaggedContent.FlagStatusChoices.BANNED
                if overall_moderation_status != ModerationStatusChoices.BANNED:
                    overall_moderation_status = ModerationStatusChoices.BANNED
            else:
                moderation_status = FlaggedContent.FlagStatusChoices.FLAGGED
                if overall_moderation_status == ModerationStatusChoices.SAFE:
                    overall_moderation_status = ModerationStatusChoices.FLAGGED
            FlaggedContentService.create_flag(
                log_entry=entry,
                content_name=content_name,
                content=content,
                is_image=is_image,
                result=result,
                moderation_status=moderation_status,
                reason=reason,
                dominant_attribute=dominant_attribute,
                severity_score=severity_score
            )
        
        # Update moderation status for log entry and target object 
        entry.set_moderation_status(overall_moderation_status)
        target_object = entry.get_target_object()
        target_object.set_moderation_status(overall_moderation_status)

    @staticmethod
    @transaction.atomic
    def set_moderation_failed_attempt(entry_id: UUID, error_message: str, is_failed_permanently: bool = False) -> None:
        try:
            entry = LogEntry.objects.get(id=entry_id)
            target_object = entry.get_target_object()
            if is_failed_permanently:
                logger.error(error_message)
                print(error_message)
                entry.set_moderation_status(ModerationStatusChoices.FAILED)
                if target_object and isinstance(target_object, TypesInModeration):
                    target_object.set_moderation_status(ModerationStatusChoices.FAILED)
                return

            retry_count = entry.retry_count
            entry.set_failed_moderation_attempt(error_message)
            if target_object and isinstance(target_object, TypesInModeration):
                target_object.set_moderation_failed_attempt(retry_count=retry_count)
        except Exception as e:
            logger.error(f"Error setting moderation failed for entry {entry_id}: {str(e)}")
            print(f"Error setting moderation failed for entry {entry_id}: {str(e)}")


class ModerationCleanupService:
    TIMEOUT = 5 * 60  # 5 minutes

    @staticmethod
    @transaction.atomic
    def cleanup_stuck_moderation_tasks(timeout: int = TIMEOUT) -> int:
        """Cleans up old moderation tasks from the database."""
        try:
            cut_off_time = datetime.datetime.now() - datetime.timedelta(seconds=timeout)
            stuck_entries = LogEntry.objects.filter(
                moderation_status__in=[ModerationStatusChoices.PROCESSING, ModerationStatusChoices.PENDING],
                moderation_started_at__lt=cut_off_time
            )
            count = 0
            for entry in stuck_entries:
                AIModerationService.set_moderation_failed_attempt(entry.id, "Moderation pipeline failed due to exceeded time limit", is_failed_permanently=True)
                count += 1
            return count
        except Exception as e:
            logger.error(f"Error cleaning up moderation tasks: {str(e)}")
            print(f"Error cleaning up moderation tasks: {str(e)}")
            return 0