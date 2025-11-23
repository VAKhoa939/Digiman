from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'digimanproject.settings')

app = Celery('digimanproject')

# Must match CELERY_* variables in Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks.py files in each app
app.autodiscover_tasks()
