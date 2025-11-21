from __future__ import annotations

import logging
from typing import Dict, Any, Tuple
from django.conf import settings
from sightengine.client import SightengineClient
from ..utils.helper_functions import get_dominant_attribute_and_score

from ..utils.env_getters import env

logger = logging.getLogger(__name__)

class SightengineService:
    """
    Uses Sightengine to evaluate images for nudity, gore,
    offensive content, etc.
    """

    MODEL_THRESHOLDS = {
        "sexual_activity": 0.15,
        "sexual_display": 0.15,
        "erotica": 0.15,

        # Suggestive classes
        "suggestive_lingerie": 0.35,
        "suggestive_bikini": 0.35,
        "suggestive_cleavage": 0.35,
        "suggestive_other": 0.35,

        # Gore & Offensive
        "gore": 0.25,
        "offensive": 0.30,
    }

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

        If the API call fails, returns {}.
        """

        if not image_url:
            return {}

        client = SightengineService.get_client()

        try:
            # Sightengine content moderation presets
            result = client.check(
                "nudity-2.0", "gore", "offensive"
            ).set_url(image_url)
        except Exception as e:
            logger.error(f"Sightengine API error: {e}")
            return {}

        return SightengineService.parse_response(result)
    
    @staticmethod
    def parse_response(response: Dict[str, Any]) -> Dict[str, float]:
        """
        Convert Sightengine response into a normalized flat dictionary.
        Keeps explicit classes, suggestive classes, context, gore, and offensive.
        """

        scores = {}

        # Nudity (nudity-2.0)
        nudity = response.get("nudity", {})

        # Explicit classes
        for key in ["sexual_activity", "sexual_display", "erotica"]:
            if key in nudity:
                scores[key] = float(nudity.get(key, 0.0))

        # Suggestive classes (dynamic flattening)
        suggestive = nudity.get("suggestive_classes", {})
        for name, value in suggestive.items():
            scores[f"suggestive_{name}"] = float(value)

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

    @staticmethod
    def is_unsafe(scores: Dict[str, float]) -> bool:
        adjusted = SightengineService.apply_context_adjustments(scores)
        for attribute, score in adjusted.items():
            if score > SightengineService.MODEL_THRESHOLDS[attribute]:
                return True
        return False
    
    @staticmethod
    def apply_context_adjustments(scores: Dict[str, float]) -> Dict[str, float]:
        adjusted = dict(scores)

        pool = scores.get("context_sea_lake_pool", 0.0)

        # RULE: reduce bikini/suggestive-other false positives in pool/beach scene
        if pool >= 0.5:
            for key in scores:
                if key.startswith("suggestive_bikini") or key.startswith("suggestive_other"):
                    adjusted[key] = adjusted[key] * 0.7  # reduce by 30%

        return adjusted
    
    @staticmethod
    def summarize_result(scores: dict) -> str:
        """
        Convert Sightengine nudity/gore/offensive scores into a clean human-readable summary.
        It picks the dominant score (highest value among relevant classes) and returns
        the appropriate label.
        """

        if not scores:
            return "Image flagged for review by automated moderation."

        # Select only meaningful problem classes (ignore context_x)
        meaningful_scores = {
            key: value for key, value in scores.items()
            if not key.startswith("context_")
        }

        if not meaningful_scores:
            return "Image flagged for review by automated moderation."

        # Pick the highest-scoring attribute
        dominant_key, dominant_score = get_dominant_attribute_and_score(meaningful_scores)

        # ----- Explicit nudity -----
        if dominant_key in ("sexual_activity", "sexual_display", "erotica"):
            label = dominant_key.replace("_", " ").title()
            return f"Explicit content detected: {label} (score {dominant_score:.2f})."

        # ----- Suggestive nudity -----
        if dominant_key.startswith("suggestive_"):
            subclass = dominant_key.replace("suggestive_", "").replace("_", " ").title()
            return f"Suggestive content detected: {subclass} (score {dominant_score:.2f})."

        # ----- Gore -----
        if dominant_key == "gore":
            return f"Gore detected (score {dominant_score:.2f})."

        # ----- Offensive -----
        if dominant_key == "offensive":
            return f"Offensive content detected (score {dominant_score:.2f})."

        # Fallback
        return f"Image flagged due to {dominant_key.replace('_', ' ')} (score {dominant_score:.2f})."

    @staticmethod
    def call_service(image_url: str) -> Tuple[Dict[str, float], bool, str]:
        scores = SightengineService.moderate(image_url)
        if not scores:
            return {}, False, "Text flagged for review by automated moderation."
        is_unsafe = SightengineService.is_unsafe(scores)
        summary = SightengineService.summarize_result(scores)
        return scores, is_unsafe, summary