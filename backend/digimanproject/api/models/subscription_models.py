from __future__ import annotations
from typing import Any, Optional, Dict, List
from datetime import datetime
from django.db import models
from django.utils import timezone
from django.contrib import admin

import uuid
from ..utils.helper_functions import update_instance

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user_models import Reader


class PaymentProviderChoices(models.TextChoices):
    STRIPE = "Stripe"
    MOMO = "Momo"
    NONE = "None"


class SubscriptionPlan(models.Model):
    class FrequencyChoices(models.TextChoices):
        PERMANENT = "permanent", "Permanent"
        HOURLY = "hourly", "Hourly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    id = models.UUIDField(
        primary_key=True, editable=False, default=uuid.uuid4)
    name = models.CharField(max_length=100, unique=True, default="Free")
    frequency = models.CharField(
        max_length=100, 
        choices=FrequencyChoices.choices, 
        default=FrequencyChoices.PERMANENT)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    description: List[str] = models.JSONField(null=False, default=list)
    features: Dict[str, Any] = models.JSONField(null=False, default=dict)
    updated_at = models.DateTimeField(default=timezone.now)

    stripe_price_id = models.CharField(max_length=100, default="", blank=True, null=True)

    def __str__(self):
        return self.name
    
    def get_name(self) -> str:
        return self.name
    
    def get_stripe_price_id(self) -> str:
        return self.stripe_price_id

    def check_access(self, feature: str) -> bool:
        return feature in self.features and self.features[feature].lower() == "true"

    def save(self, *args, **kwargs):
        # Update the "updated_at" field to the current timestamp
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def update(self, **data: Any) -> None:
        """Allowed fields: name, price_usd, frequency, 
        description, features, stripe_price_id"""
        allowed_fields = [
            "name", 
            "frequency", 
            "price_usd", 
            "description", 
            "features", 
            "stripe_price_id"
        ]
        update_instance(self, allowed_fields, **data)


class ReaderSubscription(models.Model):
    class StatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        PAST_DUE = "past_due", "Past Due"

    id = models.UUIDField(
        primary_key=True, editable=False, default=uuid.uuid4)
    reader: "Reader" = models.OneToOneField(
        "Reader", on_delete=models.CASCADE, related_name="reader_subscription")
    subscription_plan: "SubscriptionPlan" = models.ForeignKey(
        "SubscriptionPlan", 
        on_delete=models.CASCADE, 
        related_name="reader_subscription")
    
    start_date = models.DateTimeField(default=timezone.now)
    next_billing_date = models.DateTimeField(null=True, blank=True)
    last_billing_date = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=100, 
        choices=StatusChoices.choices, 
        default=StatusChoices.ACTIVE)
    is_auto_renewal = models.BooleanField(default=True)

    provider = models.CharField(
        max_length=100, 
        choices=PaymentProviderChoices.choices, 
        default=PaymentProviderChoices.NONE)
    external_subscription_id = models.CharField(max_length=100, default="")
    external_customer_id = models.CharField(max_length=100, default="")

    def __str__(self):
        return f"Reader {self.reader.get_display_name()} - {self.subscription_plan.get_name()} Plan"
    
    @admin.display(
        description="External Subscription ID",
    )
    def get_masked_external_subscription_id(self) -> str:
        if not self.external_subscription_id:
            return "None"
        n = len(self.external_subscription_id)
        return "*" * (n - 4) + self.external_subscription_id[-4:]

    def check_is_plan_premium(self) -> bool:
        return self.subscription_plan.get_name() != "Free"
    
    def toggle_auto_renewal(self) -> None:
        self.is_auto_renewal = not self.is_auto_renewal
        self.save(update_fields=["is_auto_renewal"])

    def change_plan(self, subscription_plan: SubscriptionPlan):
        self.subscription_plan = subscription_plan
        self.status = self.StatusChoices.ACTIVE
        self.is_auto_renewal = True

    def set_free_plan(self):
        self.subscription_plan = SubscriptionPlan.objects.get(name="Free")
        self.status = self.StatusChoices.ACTIVE
        self.is_auto_renewal = True
        self.start_date = timezone.now()
        self.next_billing_date = None
        self.last_billing_date = None
        self.provider = PaymentProviderChoices.NONE
        self.external_subscription_id = ""
        self.save(update_fields=["subscription_plan", "status", "is_auto_renewal",
            "start_date", "next_billing_date", "last_billing_date", 
            "provider", "external_subscription_id",])
        
    def set_past_due(self):
        self.status = self.StatusChoices.PAST_DUE
        self.save(update_fields=["status"])

    def renew(self, last_billing_date, next_billing_date):
        self.status = self.StatusChoices.ACTIVE
        self.last_billing_date = last_billing_date
        self.next_billing_date = next_billing_date
        self.save(update_fields=["status", "last_billing_date", "next_billing_date"])
        
    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: subscription_plan, status, is_auto_renewal,
        start_date, next_billing_date, last_billing_date, provider,
        external_subscription_id"""
        allowed_fields = ["subscription_plan", "status", "is_auto_renewal",
            "start_date", "next_billing_date", "last_billing_date",
            "provider", "external_subscription_id",
        ]
        update_instance(self, allowed_fields, **metadata)


class PaymentTransaction(models.Model):
    class TransactionTypeChoices(models.TextChoices):
        PURCHASE = "purchase", "Purchase"
        AUTO_RENEWAL = "auto_renewal", "Auto Renewal"

    class StatusChoices(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    id = models.UUIDField(
        primary_key=True, editable=False, default=uuid.uuid4)
    reader: "Reader" = models.ForeignKey(
        "Reader", on_delete=models.SET_NULL, 
        null=True, blank=True, related_name="payment_transactions")
    subscription_plan: "SubscriptionPlan" = models.ForeignKey(
        "SubscriptionPlan", on_delete=models.SET_NULL, 
        null=True, blank=True, related_name="payment_transactions")
    
    transaction_type = models.CharField(
        max_length=100, 
        choices=TransactionTypeChoices.choices, 
        default=TransactionTypeChoices.PURCHASE)
    amount_usd = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=100, 
        choices=StatusChoices.choices, 
        default=StatusChoices.SUCCESS)
    
    created_at = models.DateTimeField(default=timezone.now)
    paid_at = models.DateTimeField(null=True, blank=True)

    provider = models.CharField(
        max_length=100,
        choices=PaymentProviderChoices.choices,
        default=PaymentProviderChoices.STRIPE)
    external_transaction_id = models.CharField(max_length=100, default="")
    external_customer_id = models.CharField(max_length=100, default="")

    def __str__(self):
        return f"Transaction {self.created_at} - Reader {self.reader.get_display_name()}"
    
    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: reader, subscription_plan"""
        allowed_fields = ["reader", "subscription_plan",]
        update_instance(self, allowed_fields, **metadata)
    