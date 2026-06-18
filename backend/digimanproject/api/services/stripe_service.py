from pprint import pprint
from typing import Dict
from django.db import transaction

from ..models.user_models import Reader
from ..models.subscription_models import SubscriptionPlan, ReaderSubscription, PaymentTransaction, PaymentProviderChoices
from ..services.email_service import SubscriptionEmailService
from ..services.system_service import LogEntryService
from ..utils.helper_functions import stripe_ts_to_datetime
from ..utils.stripe_client import stripe
from ..utils.env_getters import env
from uuid import UUID


class StripeService:
    @staticmethod
    def create_checkout_session(
        customer_email: str, price_id: str, metadata: Dict[str, str], frontend_url: str
    ) -> Dict:
        try:
            customer_id = StripeService.create_customer(customer_email)
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[{"price": price_id, "quantity": 1}],
                mode="subscription",
                metadata=metadata,
                subscription_data={
                    "metadata": metadata
                },
                success_url=f"{frontend_url}/subscription/success",
                cancel_url=f"{frontend_url}/subscription/cancel",
            )
            return {"url": session.url, "id": session.id}
        except Exception as e:
            print("\nError creating Stripe checkout session\n")
            print(e)
            raise

    @staticmethod
    @transaction.atomic
    def handle_checkout_session_completed_event(obj: Dict) -> None:
        """
        Handle Stripe checkout session completed event.

        Update reader subscription with Stripe subscription data.
        """
        print("\nCheckout session completed event\n")
        pprint(obj)
        try:
            metadata = obj["metadata"]
            reader_id = metadata["reader_id"]
            external_customer_id = obj["customer"]
            external_subscription_id = obj["subscription"]

            reader = Reader.objects.get(id=reader_id)
            subscription = reader.get_subscription()
            subscription.update_metadata(
                external_subscription_id=external_subscription_id,
                external_customer_id=external_customer_id,
                provider=PaymentProviderChoices.STRIPE
            )
        except:
            print("\nError handling checkout session completed event\n")
            raise
        
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

        try:
            external_transaction_id = obj["id"]
            external_customer_id = obj["customer"]
            created_at = obj["created"]
            billing_reason = obj["billing_reason"]

            line_item_obj = obj["lines"]["data"][0]
            start_date = line_item_obj["period"]["start"]
            next_billing_date = line_item_obj["period"]["end"]
            subscription_metadata = line_item_obj["metadata"]

            if subscription_metadata:
                reader_id = subscription_metadata["reader_id"]
                plan_id = subscription_metadata["plan_id"]
                reader = Reader.objects.get(id=reader_id)
                plan = SubscriptionPlan.objects.get(id=plan_id)
                subscription = reader.get_subscription()
            else:
                subscription = ReaderSubscription.objects.get(external_customer_id=external_customer_id)
                reader = subscription.get_reader()
                plan = subscription.get_plan()

            if billing_reason == "subscription_create":
                transaction_type = PaymentTransaction.TransactionTypeChoices.PURCHASE
            elif billing_reason == "subscription_cycle":
                transaction_type = PaymentTransaction.TransactionTypeChoices.AUTO_RENEWAL
            else:
                return
        except:
            print("\nError processing event object in invoice paid event\n")
            raise

        try:
            if transaction_type == PaymentTransaction.TransactionTypeChoices.PURCHASE:
                transaction, created = PaymentTransaction.objects.get_or_create(
                    external_transaction_id=external_transaction_id,
                    status=PaymentTransaction.StatusChoices.PAID,
                    defaults={
                        "amount_usd": plan.get_price_usd(),
                        "created_at": stripe_ts_to_datetime(created_at),
                        "paid_at": stripe_ts_to_datetime(created_at),
                        "status": PaymentTransaction.StatusChoices.PAID,
                        "provider": PaymentProviderChoices.STRIPE,
                        "external_customer_id": external_customer_id,
                        "transaction_type": transaction_type,
                        "reader": reader,
                        "subscription_plan": plan,
                    }
                )
                if not created:
                    return
                subscription.update_metadata(
                    subscription_plan=plan,
                    status=ReaderSubscription.SubscriptionStatusChoices.ACTIVE,
                    last_purchase_status=ReaderSubscription.LastPurchaseStatusChoices.SUCCESS,
                    is_auto_renewal=True,
                    start_date=stripe_ts_to_datetime(start_date),
                    next_billing_date=stripe_ts_to_datetime(next_billing_date),
                    ended_at=None,
                    last_payment_transaction=transaction
                )
                
                LogEntryService.log_subscription_purchase(subscription)

            elif transaction_type == PaymentTransaction.TransactionTypeChoices.AUTO_RENEWAL:
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

                LogEntryService.log_subscription_auto_renewal(subscription)

            else:
                return
        except:
            print("\nError handling invoice paid event\n")
            raise

        try:
            if transaction_type == PaymentTransaction.TransactionTypeChoices.PURCHASE:
                SubscriptionEmailService.notify_success_first_purchase(transaction)
            elif transaction_type == PaymentTransaction.TransactionTypeChoices.AUTO_RENEWAL:
                SubscriptionEmailService.notify_success_auto_renewal_payment(transaction)
            else:
                return
        except:
            print("\nError sending email for invoice paid event\n")

    @staticmethod
    @transaction.atomic
    def handle_customer_subscription_updated_event(obj: dict) -> None:
        print("\nCustomer subscription updated event\n")
        pprint(obj)
        try:
            external_subscription_id = obj["id"]
            cancel_at_period_end = obj["cancel_at_period_end"]

            subscription = ReaderSubscription.objects.get(external_subscription_id=external_subscription_id)

            update_fields = {}
            if subscription.is_auto_renewal == cancel_at_period_end:
                update_fields["is_auto_renewal"] = not cancel_at_period_end
            print("log subscription renewal toggle", update_fields, subscription.is_auto_renewal, cancel_at_period_end)
            if not update_fields:
                return
            subscription.update_metadata(**update_fields)

            LogEntryService.log_subscription_renewal_toggle(subscription)
        except:
            print("\nError handling customer subscription updated event\n")
            raise

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
        try:
            external_subscription_id = obj["id"]
            ended_at = obj["ended_at"]

            subscription = ReaderSubscription.objects.get(external_subscription_id=external_subscription_id)
            subscription.update_metadata(
                status=ReaderSubscription.SubscriptionStatusChoices.ENDED,
                ended_at=stripe_ts_to_datetime(ended_at),
                next_billing_date=None,
                external_subscription_id="",
                external_customer_id=""
            )

            LogEntryService.log_subscription_ended(subscription)

            SubscriptionEmailService.notify_ended_subscription(subscription)
        except:
            print("\nError handling customer subscription deleted event\n")
            raise
        
    @staticmethod
    @transaction.atomic
    def handle_invoice_payment_failed_event(obj: dict) -> None:
        print("\nInvoice payment failed event\n")
        pprint(obj)
        try:
            external_transaction_id = obj["id"]
            external_customer_id = obj["customer"]
            created_at = obj["created"]
            next_payment_attempt_at = obj["next_payment_attempt"]

            subscription = ReaderSubscription.objects.get(external_customer_id=external_customer_id)
            reader = subscription.get_reader()
            plan = subscription.get_plan()

            transaction = PaymentTransaction.objects.create(
                external_transaction_id=external_transaction_id,
                amount_usd=plan.get_price_usd(),
                created_at=stripe_ts_to_datetime(created_at),
                next_payment_attempt_at=stripe_ts_to_datetime(next_payment_attempt_at),
                status=PaymentTransaction.StatusChoices.FAILED,
                provider=PaymentProviderChoices.STRIPE,
                external_customer_id=external_customer_id,
                transaction_type=PaymentTransaction.TransactionTypeChoices.AUTO_RENEWAL,
                reader=reader,
                subscription_plan=plan
            )
            subscription.update_metadata(
                status=ReaderSubscription.SubscriptionStatusChoices.PAST_DUE,
                last_payment_transaction=transaction
            )
        except:
            print("\nError handling invoice payment failed event\n")
            raise

        try:
            customer_portal_url = StripeService.create_customer_portal_session(reader.get_id())
            SubscriptionEmailService.notify_failed_auto_renewal_payment(transaction, customer_portal_url)
        except Exception as e:
            print("\nError sending email for invoice payment failed event\n")
            print(e)

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

    @staticmethod
    def create_customer_portal_session(user_id: UUID) -> str:
        subscription = ReaderSubscription.objects.get(reader_id=user_id)
        customer = subscription.get_external_customer_id()
        if not customer:
            raise Exception("Customer not found")
        session = stripe.billing_portal.Session.create(customer=customer, return_url=env("FRONTEND_URL"))
        return session.url