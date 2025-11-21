from __future__ import annotations

import logging
from typing import Dict, Any, Tuple

from django.conf import settings
from googleapiclient import discovery
from googleapiclient.errors import HttpError

from ..utils.helper_functions import get_dominant_attribute_and_score
from ..utils.env_getters import env

logger = logging.getLogger(__name__)

class PerspectiveAPIService:
    """
    Uses Perspective API to evaluate text content for toxicity, hate speech,
    sexual content, threats, etc.
    """
    # a constant list of attributes to let the API know what to check
    ATTRIBUTES = {
        "TOXICITY": {},
        "SEVERE_TOXICITY": {},
        "SEXUALLY_EXPLICIT": {},
        "PROFANITY": {},
    }

    # thresholds for each attribute
    ATTRIBUTE_THRESHOLDS = {
        "toxicity": 0.65,
        "severe_toxicity": 0.55,
        "sexually_explicit": 0.6,
        "profanity": 0.4,
    }

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
    def moderate(text: str) -> Dict[str, float]:
        """
        Run Perspective moderation on the given text.
        Returns a dictionary of attribute scores, e.g.:

        {
            "toxicity": 0.82,
            "profanity": 0.41,
            ...
        }

        If API fails, returns {}.
        """
        cleaned = PerspectiveAPIService.clean_text(text)
        if not cleaned:
            return {}

        client = PerspectiveAPIService.get_client()

        analyze_request = {
            "comment": {"text": cleaned},
            "requestedAttributes": PerspectiveAPIService.ATTRIBUTES,
            "languages": ["en"],
            "doNotStore": True,  # Privacy protection
        }

        try:
            response = client.comments().analyze(body=analyze_request).execute()
        except HttpError as e:
            logger.error(f"Perspective API HTTP Error: {e.content}")
            return {}
        except Exception as e:
            logger.error(f"Perspective API Request Failed: {e}")
            return {}

        return PerspectiveAPIService.parse_response(response)
    

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

        attribute_scores: Dict[str, Dict[Any]] = response.get("attributeScores", {})
        for attribute, score_obj in attribute_scores.items():
            summary = score_obj.get("summaryScore")
            if summary and "value" in summary:
                scores[attribute.lower()] = summary["value"]  # e.g. 0.82

        return scores

    @staticmethod
    def is_unsafe(scores: Dict[str, float]) -> bool:
        for attribute, score in scores.items():
            threshold = PerspectiveAPIService.ATTRIBUTE_THRESHOLDS.get(attribute)
            if threshold is not None and score >= threshold:
                return True
        return False
    
    @staticmethod
    def summarize_result(scores: dict) -> str:
        """
        Convert Perspective API attribute scores into a clean, human-readable summary.
        Identifies the dominant (highest) attribute.
        """

        if not scores:
            return "Text flagged for review by automated moderation."

        # Pick attribute with the highest score
        dominant_attr, dominant_score = get_dominant_attribute_and_score(scores)

        # Normalize display label
        label = dominant_attr.replace("_", " ").title()

        # Specific phrasing per attribute
        if dominant_attr == "toxicity":
            return f"Toxic language detected (score {dominant_score:.2f})."

        if dominant_attr == "severe_toxicity":
            return f"Severely toxic language detected (score {dominant_score:.2f})."

        if dominant_attr == "sexually_explicit":
            return f"Sexually explicit language detected (score {dominant_score:.2f})."

        if dominant_attr == "profanity":
            return f"Profanity detected (score {dominant_score:.2f})."

        # Generic fallback
        return f"Text flagged due to {label} (score {dominant_score:.2f})."
    
    @staticmethod
    def call_service(text: str) -> Tuple[Dict[str, float], bool, str]:
        scores = PerspectiveAPIService.moderate(text)
        if not scores:
            return {}, False, "Text flagged for review by automated moderation."
        is_unsafe = PerspectiveAPIService.is_unsafe(scores)
        summary = PerspectiveAPIService.summarize_result(scores)
        return scores, is_unsafe, summary
