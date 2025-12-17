# utils/celery_wake.py
import time
import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def wake_celery_worker(max_attempts=3, timeout=9):
    """
    Try to wake the Celery worker web service.
    Returns True if reachable, False otherwise.
    """
    if not settings.IS_RENDER:
        return True  # local dev: celery already running

    for attempt in range(1, max_attempts + 1):
        try:
            resp = requests.get(
                settings.CELERY_WAKE_URL,
                timeout=timeout,
            )
            if resp.status_code == 200:
                return True
        except requests.RequestException as e:
            logger.warning(
                f"Wake celery attempt {attempt} failed: {e}"
            )

        time.sleep(2)  # short backoff

    return False
