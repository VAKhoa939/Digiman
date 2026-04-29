from django.core.mail import send_mail

from ..models.user_models import Reader
from ..models.subscription_models import PaymentTransaction
from ..utils.helper_functions import format_datetime_long


class SubscriptionEmailService:
    @staticmethod
    def notify_first_payment(transaction: PaymentTransaction) -> None:
        reader = transaction.get_reader()
        created_at = format_datetime_long(transaction.get_created_at())
        recipient_list = [reader.get_email()]

        if transaction.check_success():
            paid_at = format_datetime_long(transaction.get_paid_at())

            subject="Purchase Subscription Success"
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
            subject="Purchase Subscription Failed"
            message = f"""
                Hello {reader.get_display_name()},

                We are writing to inform you that your recent payment for subscription has failed.
                Your latest payment details are as follows:
                
                - Plan: {transaction.get_plan_name()}
                - Price: ${transaction.get_amount_usd()}
                - Provider: {transaction.get_provider()}
                - Transaction created at: {created_at}
            """
        send_mail(
            subject=subject,
            message=message,
            from_email=None,
            recipient_list=recipient_list,
        )