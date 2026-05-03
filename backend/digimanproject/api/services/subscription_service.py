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

    @staticmethod
    def create_reader_subscription(
        reader: Reader, 
        subscription_plan: SubscriptionPlan,
        next_billing_date: datetime,
        last_billing_date: datetime,
        provider: str,
        external_subscription_id: str
    ) -> ReaderSubscription:
        reader_subscription = ReaderSubscription.objects.create(
            reader=reader, 
            subscription_plan=subscription_plan,
            next_billing_date=next_billing_date,
            last_billing_date=last_billing_date,
            provider=provider,
            external_subscription_id=external_subscription_id
        )
        return reader_subscription