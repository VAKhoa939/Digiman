from django.core.mail import send_mail

from ..models.subscription_models import PaymentTransaction, ReaderSubscription
from ..utils.helper_functions import format_datetime_long


class SubscriptionEmailService:
    @staticmethod
    def notify_success_first_purchase(transaction: PaymentTransaction) -> None:
        reader = transaction.get_reader()
        created_at = format_datetime_long(transaction.get_created_at())
        if not created_at:
            raise Exception("Transaction created_at is null")
        recipient_list = [reader.get_email()]
        subject = "[Digiman] Purchase Subscription Success"
        message = f"""
            Hello {reader.get_display_name()},

            We are writing to inform you that your recent payment for subscription at Digiman has been confirmed, and your subscription has been successfully activated.
            
            Your latest payment details are as follows:
            
            - Plan: {transaction.get_plan_name()}
            - Price: ${transaction.get_amount_usd()}
            - Provider: {transaction.get_provider()}
            - Transaction created at: {created_at}
            - Transaction status: {transaction.get_status().capitalize()}
        """
        send_mail(
            subject=subject,
            message=message,
            from_email=None,
            recipient_list=recipient_list,
        )

    @staticmethod
    def notify_ended_subscription(subscription: ReaderSubscription) -> None:
        reader = subscription.get_reader()
        recipient_list = [reader.get_email()]
        subject = "[Digiman] Subscription Ended"
        message = f"""
            Hello {reader.get_display_name()},

            We are writing to inform you that your subscription at Digiman has ended.
            Please renew your subscription to continue using our service.
            
            Your subscription details are as follows:
            
            - Plan: {subscription.get_plan_name()}
            - Price: ${subscription.get_plan_price_usd()}
            - Provider: {subscription.get_provider()}
            - Start date: {format_datetime_long(subscription.get_start_date())}
            - Ended at: {format_datetime_long(subscription.get_ended_at())}
        """
        send_mail(
            subject=subject,
            message=message,
            from_email=None,
            recipient_list=recipient_list,
        )

    @staticmethod
    def notify_success_auto_renewal_payment(transaction: PaymentTransaction) -> None:
        reader = transaction.get_reader()
        created_at = format_datetime_long(transaction.get_created_at())
        if not created_at:
            raise Exception("Transaction created_at is null")
        recipient_list = [reader.get_email()]
        subject = "[Digiman] Auto Renewal Payment Success"
        message = f"""
            Hello {reader.get_display_name()},

            We are writing to inform you that your recent auto renewal payment for subscription at Digiman has been confirmed, and your subscription has been successfully extended.
            
            Your latest payment details are as follows:
            
            - Plan: {transaction.get_plan_name()}
            - Price: ${transaction.get_amount_usd()}
            - Provider: {transaction.get_provider()}
            - Transaction created at: {created_at}
            - Transaction status: {transaction.get_status().capitalize()}
        """
        send_mail(
            subject=subject,
            message=message,
            from_email=None,
            recipient_list=recipient_list,
        )
    
    @staticmethod
    def notify_failed_auto_renewal_payment(
        transaction: PaymentTransaction, 
        customer_portal_url: str = None
    ) -> None:
        reader = transaction.get_reader()
        recipient_list = [reader.get_email()]
        subject = "[Digiman] Auto Renewal Payment Failed"
        created_at = format_datetime_long(transaction.get_created_at())
        if not created_at:
            raise Exception("Transaction created_at is null")
        next_payment_attempt_at = format_datetime_long(transaction.get_next_payment_attempt_at())

        if next_payment_attempt_at:
            customer_portal_message = "" if not customer_portal_url else f"""

                If you would like to change your payment method, you can do so by visiting the following link: 
                {customer_portal_url}

            """
            message = f"""
                Hello {reader.get_display_name()},

                We are writing to inform you that your recent auto renewal payment for subscription at Digiman has failed, and your subscription status has been changed to "Past Due".
                Please check your payment method to ensure that it is still valid and has sufficient funds before Stripe attempts to charge it again.
                {customer_portal_message}
                You can also go to the Pricing page of our website to subscribe a new plan again.

                Your latest payment details are as follows:
                
                - Plan: {transaction.get_plan_name()}
                - Price: ${transaction.get_amount_usd()}
                - Provider: {transaction.get_provider()}
                - Transaction created at: {created_at}
                - Transaction status: {transaction.get_status().capitalize()}
                - Next payment attempt at: {next_payment_attempt_at}
            """
        else:
            message = f"""
                Hello {reader.get_display_name()},

                We are writing to inform you that your recent auto renewal payment for subscription at Digiman has failed, and your subscription status has been changed to "Past Due".
                All payment attempts have been exhausted.

                Please go to the Pricing page of our website to subscribe a new plan again.

                Your latest payment details are as follows:
                
                - Plan: {transaction.get_plan_name()}
                - Price: ${transaction.get_amount_usd()}
                - Provider: {transaction.get_provider()}
                - Transaction created at: {created_at}
                - Transaction status: {transaction.get_status().capitalize()}
            """
        send_mail(
            subject=subject,
            message=message,
            from_email=None,
            recipient_list=recipient_list,
        )