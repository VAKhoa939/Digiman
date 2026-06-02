from __future__ import annotations

import logging
from typing import Dict, Any, Optional, Tuple

from django.conf import settings
from googleapiclient import discovery
from googleapiclient.errors import HttpError

from .system_service import ModerationThresholdService

from ..utils.helper_functions import get_dominant_attribute_and_score
from ..utils.env_getters import env

logger = logging.getLogger(__name__)

class PerspectiveAPIService:
    """
    Uses Perspective API to evaluate text content for toxicity, hate speech,
    sexual content, threats, etc.
    """
    # Lazily initialized API client
    _client = None

    @staticmethod
    def get_client():
        """Initialize the API client only once."""
        if PerspectiveAPIService._client is None:
            PerspectiveAPIService._client = discovery.build(
                "commentanalyzer",
                "v1alpha1",
                developerKey=env("PERSPECTIVE_API_KEY"),
                static_discovery=False,
            )
        return PerspectiveAPIService._client

    @staticmethod
    def clean_text(text: str) -> str:
        """Normalize and sanitize input text before sending to Perspective API."""
        if not text:
            return ""

        text = text.strip()

        # Safety limitation: Perspective max is ~20480 chars
        if len(text) > 5000:  # safe limit
            text = text[:5000]

        return text
    

    @staticmethod
    def moderate(text: str, attributes: Dict[str, Dict]) -> Dict[str, float]:
        """
        Run Perspective moderation on the given text.
        Returns a dictionary of attribute scores, e.g.:
        {
            "toxicity": 0.82,
            "profanity": 0.41,
            ...
        }
        """

        cleaned = PerspectiveAPIService.clean_text(text)
        if not cleaned:
            logger.error("Text is empty or too long.")
            raise ValueError("Text is empty or too long.")

        client = PerspectiveAPIService.get_client()

        analyze_request = {
            "comment": {"text": cleaned},
            "requestedAttributes": attributes,
            "languages": ["en"],
            "doNotStore": True,  # Privacy protection
        }

        try:
            response = client.comments().analyze(body=analyze_request).execute()
            return response
        except HttpError as e:
            logger.error(f"Perspective API HTTP Error: {e}")
            raise RuntimeError(f"Perspective API HTTP Error: {e}") from e
        except Exception as e:
            logger.error(f"Perspective API Request Failed: {e}")
            raise RuntimeError(f"Perspective API Request Failed: {e}") from e
    

    @staticmethod
    def parse_response(response: Dict[str, Any]) -> Dict[str, float]:
        """
        Extract attribute scores from Perspective API response.
        Returns a simplified dict for easier moderation logic.

        an original response might look like:

        {
        "attributeScores": {
                "TOXICITY": {
                    "summaryScore": {
                        "value": 0.82
                    }
                },
                "PROFANITY": {
                    "summaryScore": {
                        "value": 0.41
                    }
                }
            }
        }
        """
        scores: Dict[str, float] = {}
        try:
            attribute_scores: Dict[str, Dict[Any]] = response.get("attributeScores", {})
            for attribute, score_obj in attribute_scores.items():
                summary = score_obj.get("summaryScore")
                if summary and "value" in summary:
                    scores[attribute.lower()] = summary["value"]
            return scores
        except Exception as e:
            logger.error(f"Perspective API Response Parsing Error: {e}")
            raise RuntimeError(f"Perspective API Response Parsing Error: {e}") from e
    
    @staticmethod
    def generate_reason(dominant_attribute: str) -> str:
        """
        Convert Perspective API dominant attributes into a clean, human-readable reason.
        """
        # Specific phrasing per attribute
        if dominant_attribute == "toxicity":
            return "Toxic language detected."

        if dominant_attribute == "severe_toxicity":
            return "Severely toxic language detected."

        if dominant_attribute == "sexually_explicit":
            return "Sexually explicit language detected."

        if dominant_attribute == "profanity":
            return "Profanity detected."
        
        # "Safe" case
        if dominant_attribute == "safe":
            return "Image is safe to display."

        # fallback
        return f"Text flagged due to {dominant_attribute.replace('_', ' ').title()}."
    
    @staticmethod
    def call_service(text: str) -> Optional[Tuple[Dict[str, float], bool, bool, str, str, float]]:
        """
        Main function to run text moderation via Perspective API.
        
        Outputs: 
        - parsed_scores: Dictionary of attribute scores, e.g. {"toxicity": 0.82, "profanity": 0.41, ...}
        - is_flagged: True if text is flagged, False otherwise
        - is_banned: True if text is banned, False otherwise
        - reason: Human-readable reason for moderation decision
        - dominant_attribute: Attribute with highest score
        - severity_score: Severity score
        """
        attributes, attribute_thresholds = ModerationThresholdService.get_perspective_api_attributes_and_thresholds()
        scores = PerspectiveAPIService.moderate(text, attributes)
        parsed_scores = PerspectiveAPIService.parse_response(scores)
        dominant_attribute_results = get_dominant_attribute_and_score(parsed_scores, attribute_thresholds)
        if not dominant_attribute_results:
            error_message = "Perspective API failed to get dominant attribute and score."
            logger.error(error_message)
            raise ValueError(error_message)
        dominant_attribute, severity_score, is_flagged, is_banned = dominant_attribute_results
        reason = PerspectiveAPIService.generate_reason(dominant_attribute)
        return parsed_scores, is_flagged, is_banned, reason, dominant_attribute, severity_score
