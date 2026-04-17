from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from ..services.system_service import LogEntryService
from ..services.subscription_service import ReaderSubscriptionService

@receiver(user_logged_in)
def log_user_login(sender, user, request, **kwargs):
    LogEntryService.log_login(user)
    ReaderSubscriptionService.create_reader_subscription_free_plan(user.email)


@receiver(user_logged_out)
def log_user_logout(sender, user, request, **kwargs):
    LogEntryService.log_logout(user)
