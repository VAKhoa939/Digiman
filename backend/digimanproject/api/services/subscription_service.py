from django.db import transaction

from ..models.subscription_models import SubscriptionPlan, ReaderSubscription
from ..models.user_models import Reader

from datetime import datetime
import uuid

class ReaderSubscriptionService:
    @staticmethod
    @transaction.atomic
    def check_or_create_reader_subscription(id: uuid.UUID) -> None:
        """
        Check if the reader does not have ReaderSubscription object yet.
        (whether the reader has a premium plan or not does not matter).
        
        If does not, create reader subscription for free plan.
        """
        # Only a Reader account or higher will have a ReaderSubscription object.
        # (generic User account will not have it).
        reader = Reader.objects.get(id=id)
        if not reader:
            return
        if ReaderSubscription.objects.filter(reader=reader).exists():
            return
        
        free_plan = SubscriptionPlan.objects.get(name="Free")
        ReaderSubscription.objects.create(
            reader=reader, 
            subscription_plan=free_plan
        )
        return
        return reader_subscription