from django.core.mail import send_mail

from ..models.subscription_models import PaymentTransaction, ReaderSubscription
from ..utils.helper_functions import format_datetime_long


class SubscriptionEmailService:
    @staticmethod
    def notify_first_payment(transaction: PaymentTransaction) -> None:
        reader = transaction.get_reader()
        created_at = format_datetime_long(transaction.get_created_at())
        recipient_list = [reader.get_email()]

        if transaction.check_paid():
            paid_at = format_datetime_long(transaction.get_paid_at())

            subject = "Purchase Subscription Success"
            message = f"""
                Hello {reader.get_display_name()},

                We are writing to inform you that your recent payment for subscription has been confirmed, and your subscription has been successfully activated.
                Your latest payment details are as follows:
                
                - Plan: {transaction.get_plan_name()}
                - Price: ${transaction.get_amount_usd()}
                - Provider: {transaction.get_provider()}
                - Transaction created at: {created_at}
                - Transaction paid at: {paid_at}
            """
        else:
            subject = "Purchase Subscription Failed"
            message = f"""
                Hello {reader.get_display_name()},

                We are writing to inform you that your recent payment for subscription has failed.
                Your latest payment details are as follows:
                
                - Plan: {transaction.get_plan_name()}
                - Price: ${transaction.get_amount_usd()}
                - Transaction created at: {created_at}
                - Transaction failed reason: {transaction.get_failed_reason_display()}
                - Provider: {transaction.get_provider()}
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


        subject = "Subscription Expired"
        message = f"""
            Hello {reader.get_display_name()},

            We are writing to inform you that your subscription has ended.
            Please renew your subscription to continue using our service.
            Your subscription details are as follows:
            
            - Plan: {subscription.get_plan_name()}
            - Price: ${subscription.get_plan_price_usd()}
            - Ended at: {format_datetime_long(subscription.get_ended_at())}
        """
        send_mail(
            subject=subject,
            message=message,
            from_email=None,
            recipient_list=recipient_list,
        )

    @staticmethod
    def notify_auto_renewal_payment(transaction: PaymentTransaction) -> None:
        reader = transaction.get_reader()
        created_at = format_datetime_long(transaction.get_created_at())
        recipient_list = [reader.get_email()]

        if transaction.check_paid():
            paid_at = format_datetime_long(transaction.get_paid_at())
            subject = "Auto Renewal Payment Success"
            message = f"""
                Hello {reader.get_display_name()},

                We are writing to inform you that your recent auto renewal payment has been confirmed, and your subscription has been successfully extended.
                Your latest payment details are as follows:
                
                - Plan: {transaction.get_plan_name()}
                - Price: ${transaction.get_amount_usd()}
                - Provider: {transaction.get_provider()}
                - Transaction created at: {created_at}
                - Transaction paid at: {paid_at}
            """
        else:
            subject = "Auto Renewal Payment Failed"
            message = f"""
                Hello {reader.get_display_name()},

                We are writing to inform you that your recent auto renewal payment has failed.
                Your latest payment details are as follows:
                
                - Plan: {transaction.get_plan_name()}
                - Price: ${transaction.get_amount_usd()}
                - Transaction created at: {created_at}
                - Transaction failed reason: {transaction.get_failed_reason_display()}
                - Provider: {transaction.get_provider()}
            """
        send_mail(
            subject=subject,
            message=message,
            from_email=None,
            recipient_list=recipient_list,
        )