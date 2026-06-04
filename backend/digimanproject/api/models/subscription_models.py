from __future__ import annotations
from typing import Any, Dict, List
from datetime import datetime
from django.db import models
from django.utils import timezone
from django.contrib import admin

import uuid
from ..utils.helper_functions import update_instance, remove_unchanged_and_denied_fields

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user_models import Reader


class PaymentProviderChoices(models.TextChoices):
    STRIPE = "Stripe"
    MOMO = "Momo"
    NONE = "None"


class SubscriptionFeatureChoices(models.TextChoices):
    PREMIUM_CHAPTERS = "premium_chapters"
    OFFLINE_READING = "offline_reading"


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

    class Meta:
        ordering = ["price_usd"]
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"

    def __str__(self):
        return self.name
    
    def get_name(self) -> str:
        return self.name
    
    def get_price_usd(self) -> float:
        return self.price_usd
    
    def get_stripe_price_id(self) -> str:
        return self.stripe_price_id
    
    def get_frequency(self) -> str:
        return self.frequency
    
    def get_features(self) -> Dict[str, Any]:
        return self.features
    
    def get_description(self) -> List[str]:
        return self.description

    def has_access(self, feature: str) -> bool:
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
    class SubscriptionStatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        PAST_DUE = "past_due", "Past Due"
        ENDED = "ended", "Ended"

    class LastPurchaseStatusChoices(models.TextChoices):
        SUCCESS = "success", "Success"
        PENDING = "pending", "Pending"
        FAILED = "failed", "Failed"
        NONE = "none", "None"

    id = models.UUIDField(
        primary_key=True, editable=False, default=uuid.uuid4)
    reader: "Reader" = models.OneToOneField(
        "Reader", on_delete=models.CASCADE, 
        related_name="reader_subscription"
    )
    subscription_plan: "SubscriptionPlan" = models.ForeignKey(
        "SubscriptionPlan", 
        on_delete=models.CASCADE, 
        related_name="reader_subscription"
    )
    last_payment_transaction: "PaymentTransaction" = models.ForeignKey(
        "PaymentTransaction", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="reader_subscription"
    )
    
    start_date = models.DateTimeField(default=timezone.now)
    next_billing_date = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=100, 
        choices=SubscriptionStatusChoices.choices, 
        default=SubscriptionStatusChoices.ACTIVE)
    is_auto_renewal = models.BooleanField(default=False)
    last_purchase_status = models.CharField(
        max_length=100, 
        choices=LastPurchaseStatusChoices.choices, 
        default=LastPurchaseStatusChoices.NONE
    )

    provider = models.CharField(
        max_length=100, 
        choices=PaymentProviderChoices.choices, 
        default=PaymentProviderChoices.NONE)
    external_subscription_id = models.CharField(max_length=100, default="")
    external_customer_id = models.CharField(max_length=100, default="")

    class Meta:
        verbose_name = "Reader Subscription"
        verbose_name_plural = "Reader Subscriptions"

    def __str__(self):
        return f"Reader {self.reader.get_display_name()} - {self.subscription_plan.get_name()} Plan"
    
    def get_plan_features(self) -> Dict[str, Any]:
        return self.subscription_plan.get_features()
    
    def get_plan_name(self) -> str:
        return self.subscription_plan.get_name()
    
    def get_plan_price_usd(self) -> float:
        return self.subscription_plan.get_price_usd()
    
    def get_is_auto_renewal(self) -> bool:
        return self.is_auto_renewal
    
    def get_start_date(self) -> datetime:
        return self.start_date
    
    def get_ended_at(self) -> datetime | None:
        return self.ended_at
    
    def get_last_purchase_status(self) -> str:
        return self.last_purchase_status
    
    def get_provider(self) -> str:
        return self.provider
    
    @admin.display(
        description="Last Payment Created At",
    )
    def get_last_payment_created_at(self) -> datetime | None:
        if not self.last_payment_transaction:
            return None
        return self.last_payment_transaction.get_created_at()
    
    @admin.display(
        description="Last Payment Status",
    )
    def get_last_payment_status(self) -> str:
        if not self.last_payment_transaction:
            return "none"
        return self.last_payment_transaction.get_status()
    
    @admin.display(
        description="Last Billing Date",
    )
    def get_last_billing_date(self) -> datetime | None:
        if not self.last_payment_transaction:
            return None
        return self.last_payment_transaction.get_paid_at()
    
    def get_last_payment_transaction(self) -> "PaymentTransaction" | None:
        return self.last_payment_transaction
    
    def get_plan(self) -> "SubscriptionPlan":
        return self.subscription_plan
    
    def get_reader(self) -> "Reader":
        return self.reader

    @admin.display(
        description="External Subscription ID",
    )
    def get_masked_external_subscription_id(self) -> str:
        if not self.external_subscription_id:
            return "None"
        n = len(self.external_subscription_id)
        return self.external_subscription_id[:4] + "*" * (n - 8) + self.external_subscription_id[-4:]

    @admin.display(
        description="External Customer ID",
    )
    def get_masked_external_customer_id(self) -> str:
        if not self.external_customer_id:
            return "None"
        n = len(self.external_customer_id)
        return self.external_customer_id[:4] + "*" * (n - 8) + self.external_customer_id[-4:]
    
    def get_external_subscription_id(self) -> str:
        return self.external_subscription_id
    
    def get_external_customer_id(self) -> str:
        return self.external_customer_id

    def check_plan_premium(self) -> bool:
        return self.subscription_plan.get_name() != "Free"
    
    def is_active(self) -> bool:
        return self.status == self.SubscriptionStatusChoices.ACTIVE
    
    def has_access(self, feature: str) -> bool:
        return self.subscription_plan.has_access(feature)
    
    def update_metadata(self, **metadata: Any) -> bool:
        """Allowed fields: 
        subscription_plan, status, is_auto_renewal, last_purchase_status,
        start_date, next_billing_date, ended_at, last_payment_transaction,
        provider, external_subscription_id, external_customer_id"""
        allowed_fields = [
            "subscription_plan", 
            "status", 
            "is_auto_renewal",
            "last_purchase_status",
            "start_date", 
            "next_billing_date", 
            "ended_at",
            "last_payment_transaction",
            "provider", 
            "external_subscription_id", 
            "external_customer_id",
        ]
        metadata = remove_unchanged_and_denied_fields(self, allowed_fields, **metadata)
        return update_instance(self, **metadata)

    def start_purchase(self) -> None:
        """Update last purchase status to pending"""
        status = self.LastPurchaseStatusChoices.PENDING
        self.update_metadata(last_purchase_status=status)

    def toggle_auto_renewal(self) -> None:
        is_auto_renewal = not self.is_auto_renewal
        self.update_metadata(is_auto_renewal=is_auto_renewal)


class PaymentTransaction(models.Model):
    class TransactionTypeChoices(models.TextChoices):
        PURCHASE = "purchase", "Purchase"
        AUTO_RENEWAL = "auto_renewal", "Auto Renewal"

    class StatusChoices(models.TextChoices):
        PAID = "paid", "Paid"
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
        default=StatusChoices.PAID)
    
    created_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    next_payment_attempt_at = models.DateTimeField(null=True, blank=True)

    provider = models.CharField(
        max_length=100,
        choices=PaymentProviderChoices.choices,
        default=PaymentProviderChoices.STRIPE)
    external_transaction_id = models.CharField(max_length=100, default="")
    external_customer_id = models.CharField(max_length=100, default="")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Payment Transaction"
        verbose_name_plural = "Payment Transactions"

    def __str__(self):
        from ..utils.helper_functions import format_datetime_long
        return f"Transaction {format_datetime_long(self.created_at)} - Reader {self.reader.get_display_name()}"
    
    @admin.display(description="External Transaction ID")
    def get_masked_external_transaction_id(self) -> str:
        if not self.external_transaction_id:
            return "None"
        n = len(self.external_transaction_id)
        return self.external_transaction_id[:4] + "*" * (n - 8) + self.external_transaction_id[-4:]
    
    @admin.display(description="External Customer ID")
    def get_masked_external_customer_id(self) -> str:
        if not self.external_customer_id:
            return "None"
        n = len(self.external_customer_id)
        return self.external_customer_id[:4] + "*" * (n - 8) + self.external_customer_id[-4:]

    def get_reader(self) -> "Reader":
        return self.reader
    
    def get_amount_usd(self) -> float:
        return self.amount_usd
    
    def get_created_at(self) -> datetime | None:
        return self.created_at
    
    def get_paid_at(self) -> datetime | None:
        return self.paid_at
    
    def get_next_payment_attempt_at(self) -> datetime | None:
        return self.next_payment_attempt_at

    def get_status(self) -> str:
        return self.status
    
    def get_provider(self) -> str:
        return self.provider
    
    def get_plan_name(self) -> str:
        return self.subscription_plan.get_name()
    
    def check_paid(self) -> bool:
        return self.status == self.StatusChoices.PAID
    