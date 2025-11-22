from django.db import transaction
from ..models.system_models import LogEntry
from .perspective_api_service import PerspectiveAPIService
from .sightengine_service import SightengineService
from .system_service import SystemService
import logging

logger = logging.getLogger(__name__)

from typing import Any, Dict, List

class AIModerationService:
    """
    Main AI-based moderation pipeline.
    Loads all unmoderated LogEntries, processes each attribute,
    and creates FlaggedContent objects if AI detects unsafe content.
    """

    @staticmethod
    def run_moderation_pipeline() -> None:
        """
        Runs AI moderation pipeline in background.
        Safely processes entries one-by-one.
        """

        entries = LogEntry.objects.filter(is_moderated=False)

        for entry in entries:
            try:
                AIModerationService.process_log_entry(entry)
                with transaction.atomic():
                    entry.moderate()
            except Exception as e:
                # Log error but continue with next entries
                logger.error(f"[Moderation Error] Entry {entry.id}: {e}")

    @staticmethod
    def process_log_entry(entry: LogEntry) -> None:
        """
        Processes a single LogEntry object.
        
        Includes: extracting attributes, running AI moderation, 
        deciding if unsafe, and creating FlaggedContent objects.
        """
        details = entry.details or {}
        attrs: List[Dict[str, Any]] = details.get("attributes", [])

        for attr in attrs:
            # Extract attribute fields
            content_name = attr.get("attributeName")
            is_image = str(attr.get("isImage")).lower() == "true"
            content = attr.get("content")

            if not content:
                continue  # ignore empty attributes

            # Run the appropriate AI moderation
            try:
                if is_image:
                    result, is_unsafe, reason, dominant_attribute, severity_score = SightengineService.call_service(content)
                else:
                    result, is_unsafe, reason, dominant_attribute, severity_score = PerspectiveAPIService.call_service(content)
            except Exception as e:
                logger.error(f"AI moderation failed for {content_name}: {e}")
                continue

            # If no results, skip
            if not result:
                continue

            # Resolve old flags for this content
            SystemService.resolve_old_flags(entry.target_object_type, entry.target_object_id, content_name)

            # Decide if unsafe to start creating flagged content
            if not is_unsafe:
                continue
            SystemService.create_flag(
                log_entry=entry,
                content_name=content_name,
                content=content,
                is_image=is_image,
                result=result,
                reason=reason,
                dominant_attribute=dominant_attribute,
                severity_score=severity_score
            )
