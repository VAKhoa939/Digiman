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

        Update reader subscription with Stripe subscription data.
        """
        print("\nCheckout session completed event\n")
        pprint(obj)
        metadata = obj["metadata"]
        reader_id = metadata["reader_id"]
        external_customer_id = obj["customer"]
        external_subscription_id = obj["subscription"]

        reader = Reader.objects.get(id=reader_id)
        subscription = reader.get_subscription()
        # If the reader already has a subscription (activated via invoice.paid event), 
        # only update external_subscription_id and status,
        # and send notification email
        subscription.update_metadata(
            external_subscription_id=external_subscription_id,
            external_customer_id=external_customer_id,
            provider=PaymentProviderChoices.STRIPE
        )
        
    @staticmethod
    @transaction.atomic
    def handle_invoice_paid_event(obj: dict) -> None:
        """
        Handle Stripe invoice paid event.

        Create payment transaction record with Stripe invoice data.

        Update reader subscription with Stripe invoice data and set status to ACTIVE.
        """
        print("\nInvoice paid event\n")
        pprint(obj)
        external_transaction_id = obj["id"]
        external_customer_id = obj["customer"]
        paid_at = obj["created"]
        next_billing_date = obj["period_end"]
        last_billing_date = obj["period_start"]
        subscription_metadata = obj["parent"]["subscription_details"]["metadata"]
        reader_id = subscription_metadata["reader_id"]
        plan_id = subscription_metadata["plan_id"]

        reader = Reader.objects.get(id=reader_id)
        plan = SubscriptionPlan.objects.get(id=plan_id)

        transaction, created = PaymentTransaction.objects.get_or_create(
            reader=reader,
            subscription_plan=plan,
            amount_usd=plan.get_price_usd(),
            paid_at=stripe_ts_to_datetime(paid_at),
            status=PaymentTransaction.StatusChoices.SUCCESS,
            provider=PaymentProviderChoices.STRIPE,
            external_customer_id=external_customer_id,
            external_transaction_id=external_transaction_id,
        )

        subscription = reader.get_subscription()
        subscription.update_metadata(
            subscription_plan=plan,
            status=ReaderSubscription.SubscriptionStatusChoices.ACTIVE,
            is_auto_renewal=True,
            last_payment_status=ReaderSubscription.LastPaymentStatusChoices.PAID,
            next_billing_date=stripe_ts_to_datetime(next_billing_date),
            last_billing_date=stripe_ts_to_datetime(last_billing_date),
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

