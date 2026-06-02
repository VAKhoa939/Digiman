from ..models.system_models import LogEntry, FlaggedContent
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

        if entry.get_moderation_status() != LogEntry.ModerationStatusChoices.PENDING:
            return
        
        try:
            target_object = entry.get_target_object()
            if not target_object or not isinstance(target_object, TypesInModeration):
                raise ValueError("Target object not found or not in moderation")
        except Exception as e:
            # Log error but continue with next entries
            logger.error(f"[Moderation Error] Entry {str(entry)}: {e}")
            print(f"[Moderation Error] Entry {str(entry)}: {e}")
            entry.set_failed_moderation_attempt(str(e))
            return

        try:
            entry.set_moderation_status(LogEntry.ModerationStatusChoices.PROCESSING)
            target_object.set_moderation_status(LogEntry.ModerationStatusChoices.PROCESSING)
            print(f"Moderating entry {str(entry)}")
            AIModerationService.process_log_entry(entry)
        except Exception as e:
            # Log error but continue with next entries
            logger.error(f"[Moderation Error] Entry {str(entry)}: {e}")
            print(f"[Moderation Error] Entry {str(entry)}: {e}")
            entry.set_failed_moderation_attempt(str(e))
            target_object.set_moderation_status(LogEntry.ModerationStatusChoices.FAILED)

    @staticmethod
    def process_log_entry(entry: LogEntry) -> None:
        """
        Processes a single LogEntry object.
        
        Includes: extracting attributes, running appropriate AI API service, 
        deciding if content is unsafe, and creating FlaggedContent objects.
        """
        details = entry.get_details()
        overall_moderation_status = LogEntry.ModerationStatusChoices.SAFE

        attrs: List[Dict[str, Any]] = details.get("attributes", [])
        for attr in attrs:
            # Extract attribute fields
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
                moderation_status = FlaggedContent.ModerationStatusChoices.BANNED
                if overall_moderation_status != LogEntry.ModerationStatusChoices.BANNED:
                    overall_moderation_status = LogEntry.ModerationStatusChoices.BANNED
            else:
                moderation_status = FlaggedContent.ModerationStatusChoices.FLAGGED
                if overall_moderation_status == LogEntry.ModerationStatusChoices.SAFE:
                    overall_moderation_status = LogEntry.ModerationStatusChoices.FLAGGED
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
