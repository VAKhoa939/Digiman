from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from ..services.system_service import LogEntryService

@receiver(user_logged_in)
def log_user_login(sender, user, request, **kwargs):
    LogEntryService.log_login(user)

@receiver(user_logged_out)
def log_user_logout(sender, user, request, **kwargs):
    LogEntryService.log_logout(user)
