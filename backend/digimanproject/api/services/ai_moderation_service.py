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
    @transaction.atomic
    def run_moderation_pipeline() -> None:
        """
        Main entrypoint for moderation.
        Should be called by:
            - cron job
            - management command
            - celery worker
        """

        entries = LogEntry.objects.filter(is_moderated=False)

        for entry in entries:
            AIModerationService.process_log_entry(entry)
            entry.moderate()

    @staticmethod
    def process_log_entry(entry: LogEntry) -> None:
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
