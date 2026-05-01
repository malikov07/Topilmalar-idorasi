# lost_item_platform/celery.py
import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
# Replace 'lost_item_platform' with your actual folder name
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lost_items.settings')

app = Celery('lost_items')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()