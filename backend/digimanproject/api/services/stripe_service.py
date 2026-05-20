from pprint import pprint
from typing import Dict
from django.db import transaction

from ..models.user_models import Reader
from ..models.subscription_models import SubscriptionPlan, ReaderSubscription, PaymentTransaction, PaymentProviderChoices
from ..services.email_service import SubscriptionEmailService
from ..utils.helper_functions import stripe_ts_to_datetime
from ..utils.stripe_client import stripe
from ..utils.env_getters import env
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
        created_at = obj["created"]
        line_item_obj = obj["lines"]["data"][0]
        start_date = line_item_obj["period"]["start"]
        next_billing_date = line_item_obj["period"]["end"]
        billing_reason = obj["billing_reason"]

        match billing_reason:
            case "subscription_create":
                subscription_metadata = line_item_obj["metadata"]
                reader_id = subscription_metadata["reader_id"]
                plan_id = subscription_metadata["plan_id"]

                reader = Reader.objects.get(id=reader_id)
                plan = SubscriptionPlan.objects.get(id=plan_id)
                transaction, created = PaymentTransaction.objects.get_or_create(
                    external_transaction_id=external_transaction_id,
                    defaults={
                        "amount_usd": plan.get_price_usd(),
                        "created_at": stripe_ts_to_datetime(created_at),
                        "paid_at": stripe_ts_to_datetime(created_at),
                        "status": PaymentTransaction.StatusChoices.PAID,
                        "provider": PaymentProviderChoices.STRIPE,
                        "external_customer_id": external_customer_id,
                        "transaction_type": PaymentTransaction.TransactionTypeChoices.PURCHASE,
                        "reader": reader,
                        "subscription_plan": plan
                    }
                )
                if not created:
                    return
                subscription = reader.get_subscription()
                subscription.update_metadata(
                    subscription_plan=plan,
                    status=ReaderSubscription.SubscriptionStatusChoices.ACTIVE,
                    last_purchase_status=ReaderSubscription.LastPurchaseStatusChoices.SUCCESS,
                    is_auto_renewal=True,
                    start_date=stripe_ts_to_datetime(start_date),
                    next_billing_date=stripe_ts_to_datetime(next_billing_date),
                    last_payment_transaction=transaction
                )
                SubscriptionEmailService.notify_first_payment(transaction)
            case "subscription_cycle":
                external_subscription_id = line_item_obj["parent"]["subscription_item_details"]["subscription"]
                subscription = ReaderSubscription.objects.get(external_subscription_id=external_subscription_id)
                reader = subscription.get_reader()
                plan = subscription.get_plan()
                transaction, created = PaymentTransaction.objects.get_or_create(
                    external_transaction_id=external_transaction_id,
                    defaults={
                        "amount_usd": plan.get_price_usd(),
                        "created_at": stripe_ts_to_datetime(created_at),
                        "paid_at": stripe_ts_to_datetime(created_at),
                        "status": PaymentTransaction.StatusChoices.PAID,
                        "provider": PaymentProviderChoices.STRIPE,
                        "external_customer_id": external_customer_id,
                        "transaction_type": PaymentTransaction.TransactionTypeChoices.AUTO_RENEWAL,
                        "reader": reader,
                        "subscription_plan": plan
                    }
                )
                if not created:
                    return
                subscription.update_metadata(
                    status=ReaderSubscription.SubscriptionStatusChoices.ACTIVE,
                    is_auto_renewal=True,
                    next_billing_date=stripe_ts_to_datetime(next_billing_date),
                    last_payment_transaction=transaction
                )
                SubscriptionEmailService.notify_auto_renewal_payment(transaction)
            case _:
                return

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

    @staticmethod
    def toggle_cancel_at_period_end(user_id: UUID) -> None:
        subscription = ReaderSubscription.objects.get(reader_id=user_id)
        stripe.Subscription.modify(
            id=subscription.external_subscription_id,
            cancel_at_period_end=subscription.is_auto_renewal
        )

    @staticmethod
    @transaction.atomic
    def handle_customer_subscription_deleted_event(obj: dict) -> None:
        print("\nCustomer subscription deleted event\n")
        pprint(obj)
        external_subscription_id = obj["id"]
        ended_at = obj["ended_at"]

        subscription = ReaderSubscription.objects.get(external_subscription_id=external_subscription_id)
        subscription.update_metadata(
            status=ReaderSubscription.SubscriptionStatusChoices.ENDED,
            ended_at=stripe_ts_to_datetime(ended_at),
            next_billing_date=None
        )
        
    @staticmethod
    @transaction.atomic
    def handle_invoice_payment_failed_event(obj: dict) -> None:
        print("\nInvoice payment failed event\n")
        pprint(obj)
        # external_transaction_id = obj["id"]
        # external_customer_id = obj["customer"]
        # created_at = obj["created"]
        # payment_intent_id = obj["payment_intent"]
        # external_subscription_obj = obj["lines"]["data"][0]

        # payment_intent_obj = stripe.PaymentIntent.retrieve(payment_intent_id)
        # if payment_intent_obj:


        # external_subscription_id = external_subscription_obj["id"]
        # subscription = ReaderSubscription.objects.get(external_subscription_id=external_subscription_id)
        # reader = subscription.get_reader()
        # plan = subscription.get_plan()
        # transaction, created = PaymentTransaction.objects.get_or_create(
        #     external_transaction_id=external_transaction_id,
        #     defaults={
        #         "amount_usd": plan.get_price_usd(),
        #         "created_at": stripe_ts_to_datetime(created_at),
        #         "status": PaymentTransaction.StatusChoices.FAILED,
        #         "provider": PaymentProviderChoices.STRIPE,
        #         "external_customer_id": external_customer_id,
        #         "transaction_type": PaymentTransaction.TransactionTypeChoices.AUTO_RENEWAL,
        #         "reader": reader,
        #         "subscription_plan": plan
        #     }
        # )
        # if not created:
        #     return
        # subscription.update_metadata(
        #     status=ReaderSubscription.SubscriptionStatusChoices.PAST_DUE,
        #     last_payment_transaction=transaction
        # )
        # SubscriptionEmailService.notify_auto_renewal_payment(transaction)

    @staticmethod
    def create_customer(customer_email: str) -> str:
        customer_data = {
            "email": customer_email
        }
        if env("STRIPE_USE_TEST_CLOCK") == "True":
            from time import time
            frozen_time = int(time())
            test_clock = stripe.test_helpers.TestClock.create(frozen_time=frozen_time, name=f"Test clock {customer_email} - {frozen_time}")

            customer_data["test_clock"] = test_clock.id
        customer = stripe.Customer.create(**customer_data)
        return customer.id