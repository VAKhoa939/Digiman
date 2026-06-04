from django.db import models

class ModerationStatusChoices(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    SAFE = "safe", "Safe"
    FLAGGED = "flagged", "Flagged"
    BANNED = "banned", "Banned"
    FAILED = "failed", "Failed"