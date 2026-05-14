from pprint import pprint
from typing import Dict
from django.db import transaction

from ..models.user_models import Reader
from ..models.subscription_models import SubscriptionPlan, ReaderSubscription, PaymentTransaction, PaymentProviderChoices
from ..services.email_service import SubscriptionEmailService
from ..utils.helper_functions import stripe_ts_to_datetime
from ..utils.stripe_client import stripe
from uuid import UUID


class StripeService:
    @staticmethod
    @transaction.atomic
    def handle_checkout_session_completed_event(obj: Dict) -> None:
        """
        Handle Stripe checkout session completed event.

        Update reader subscription with Stripe subscription data 
        and set status to INACTIVE (because of waiting for payment confirmation
        via Stripe invoice events).
        """
        pprint(obj)
        metadata = obj["metadata"]
        reader_id = metadata["reader_id"]
        plan_id = metadata["plan_id"]
        external_customer_id = obj["customer"]
        external_subscription_id = obj["subscription"]

        reader = Reader.objects.get(id=reader_id)
        plan = SubscriptionPlan.objects.get(id=plan_id)

        subscription = reader.get_subscription()
        subscription.update_metadata(
            subscription_plan=plan,
            external_subscription_id=external_subscription_id,
            external_customer_id=external_customer_id,
            status=ReaderSubscription.SubscriptionStatusChoices.INACTIVE,
            last_payment_status=ReaderSubscription.LastPaymentStatusChoices.PENDING,
            provider=PaymentProviderChoices.STRIPE,
            is_auto_renewal=False
        )

    @staticmethod
    @transaction.atomic
    def handle_invoice_paid_event(obj: dict) -> None:
        """
        Handle Stripe invoice paid event.

        Create payment transaction record with Stripe invoice data.

        Update reader subscription with Stripe invoice data and set status to ACTIVE.
        """
        pprint(obj)
        external_transaction_id = obj["id"]
        external_customer_id = obj["customer"]
        paid_at = obj["created"]
        next_billing_date = obj["period_end"]
        last_billing_date = obj["period_start"]

        subscription = ReaderSubscription.objects.get(external_customer_id=external_customer_id)
        subscription.update_metadata(
            next_billing_date=stripe_ts_to_datetime(next_billing_date),
            last_billing_date=stripe_ts_to_datetime(last_billing_date),
            status=ReaderSubscription.SubscriptionStatusChoices.ACTIVE,
            last_payment_status=ReaderSubscription.LastPaymentStatusChoices.PAID,
            is_auto_renewal=True
        )

        reader = subscription.get_reader()
        plan = subscription.get_plan()

        transaction = PaymentTransaction.objects.create(
            reader=reader,
            subscription_plan=plan,
            amount_usd=plan.get_price_usd(),
            paid_at=stripe_ts_to_datetime(paid_at),
            provider=PaymentProviderChoices.STRIPE,
            external_transaction_id=external_transaction_id,
            external_customer_id=external_customer_id,
            status=PaymentTransaction.StatusChoices.SUCCESS
        )

        SubscriptionEmailService.notify_first_payment(transaction)

    @staticmethod
    @transaction.atomic
    def handle_customer_subscription_updated_event(obj: dict) -> None:
        pprint(obj)
        external_subscription_id = obj["id"]
        cancel_at_period_end = obj["cancel_at_period_end"]

        subscription = ReaderSubscription.objects.get(external_subscription_id=external_subscription_id)
        subscription.update_metadata(
            is_auto_renewal=not cancel_at_period_end
        )

    def toggle_cancel_at_period_end(user_id: UUID) -> None:
        subscription = ReaderSubscription.objects.get(reader_id=user_id)
        stripe.Subscription.modify(
            id=subscription.external_subscription_id,
            cancel_at_period_end=subscription.is_auto_renewal
        )

