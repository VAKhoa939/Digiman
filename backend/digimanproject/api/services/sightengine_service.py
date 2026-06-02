from __future__ import annotations

import logging
from typing import Dict, Any, Optional, Tuple
from django.conf import settings
from sightengine.client import SightengineClient

from .system_service import ModerationThresholdService

from ..utils.helper_functions import get_dominant_attribute_and_score
from ..utils.env_getters import env

logger = logging.getLogger(__name__)

class SightengineService:
    """
    Uses Sightengine to evaluate images for nudity, gore,
    offensive content, etc.
    """
    _client: SightengineClient | None = None

    @staticmethod
    def get_client() -> SightengineClient:
        """Initialize the Sightengine client once per worker."""
        if SightengineService._client is None:
            SightengineService._client = SightengineClient(
                env("SIGHTENGINE_USER"),
                env("SIGHTENGINE_SECRET"),
            )
        return SightengineService._client
    
    @staticmethod
    def moderate(image_url: str) -> Dict[str, float]:
        """
        Moderate an image via URL.
        Returns a dictionary of scores, e.g.:

        {
            "sexual_display": 0.12,
            "suggestive_bikini": 0.44,
            "gore": 0.03,
            "offensive": 0.22,
            "context_pool": 0.31
        }
        """

        if not image_url:
            raise ValueError("Image URL is empty.")

        client = SightengineService.get_client()

        try:
            # Sightengine content moderation API models
            result = client.check(
                "nudity-2.0", 
                "gore", 
                "offensive"
            ).set_url(image_url)
        except Exception as e:
            logger.error(f"Sightengine API request failed: {e}")
            raise RuntimeError(f"Sightengine API request failed: {e}")
    
    @staticmethod
    def parse_response(response: Dict[str, Any]) -> Dict[str, float]:
        """
        Convert Sightengine response into a normalized flat dictionary.
        Keeps explicit classes, suggestive classes, context, gore, and offensive.
        """

        scores = {}

        try:
                
            # Nudity (nudity-2.0)
            nudity = response.get("nudity", {})

            # Explicit classes
            for key in ["sexual_activity", "sexual_display", "erotica"]:
                if key in nudity:
                    scores[key] = float(nudity.get(key, 0.0))

            # Suggestive classes (dynamic flattening)
            suggestive = nudity.get("suggestive_classes", {})
            
            MAPPING = {
                "lingerie": "suggestive_lingerie",
                "bikini": "suggestive_bikini",
                "cleavage": "suggestive_cleavage",
                "other": "suggestive_other",
            }

            for raw_key, mapped_key in MAPPING.items():
                value = suggestive.get(raw_key)
                if value is not None:
                    scores[mapped_key] = float(value)
                else:
                    scores[mapped_key] = 0.0  # ensure key always exists

            # Context classes (optional: not thresholded, admins interpret)
            context = nudity.get("context", {})
            for name, value in context.items():
                scores[f"context_{name}"] = float(value)

            # Gore
            gore = response.get("gore", {})
            if "probability" in gore:
                scores["gore"] = float(gore["probability"])

            # Offensive
            offensive = response.get("offensive", {})
            if "prob" in offensive:
                scores["offensive"] = float(offensive["prob"])

            return scores

        except Exception as e:
            logger.error(f"Sightengine API parsing error: {e}")
            raise RuntimeError(f"Sightengine API parsing error: {e}") from e
    
    @staticmethod
    def generate_reason(dominant_attribute: str) -> str:
        """
        Convert Sightengine dominant attribute into a clean human-readable reason.
        """
        # ----- Explicit nudity -----
        if dominant_attribute in ("sexual_activity", "sexual_display", "erotica"):
            label = dominant_attribute.replace("_", " ").title()
            return f"{label} content detected."

        # ----- Suggestive nudity -----
        if dominant_attribute.startswith("suggestive_"):
            subclass = dominant_attribute.replace("suggestive_", "").replace("_", " ").title()
            return f"Suggestive content detected - {subclass}."

        # "Safe" & Other simple classes
        if dominant_attribute == "gore":
            return "Gore content detected."

        if dominant_attribute == "offensive":
            return "Offensive content detected."
        
        if dominant_attribute == "safe":
            return "Image is safe to display."

        # Fallback
        return f"Image flagged due to {dominant_attribute.replace('_', ' ')}."

    @staticmethod
    def call_service(image_url: str) -> Optional[Tuple[Dict[str, float], bool, bool, str, str, float]]:
        """
        Main function to run image moderation via Sightengine.
        
        Outputs: 
        - parsed_scores: Dictionary of attribute scores, e.g. {"sexual_display": 0.12, "suggestive_bikini": 0.44, "context_pool": 0.31, ...}
        - is_flagged: True if image is flagged, False otherwise
        - is_banned: True if image is banned, False otherwise
        - reason: Human-readable reason for moderation decision
        - dominant_attribute: Attribute with highest score
        - severity_score: Severity score
        """
        model_thresholds = ModerationThresholdService.get_sightengine_thresholds()
        scores = SightengineService.moderate(image_url)
        parsed_scores = SightengineService.parse_response(scores)
        dominant_attribute_results = get_dominant_attribute_and_score(parsed_scores, model_thresholds)
        if not dominant_attribute_results:
            error_message = "Sightengine failed to get dominant attribute and score."
            logger.error(error_message)
            raise ValueError(error_message)
        dominant_attribute, severity_score, is_flagged, is_banned = dominant_attribute_results
        reason = SightengineService.generate_reason(dominant_attribute)
        return parsed_scores, is_flagged, is_banned, reason, dominant_attribute, severity_score