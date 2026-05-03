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
    
    def get_features(self) -> Dict[str, Any]:
        return self.features

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
    class SubscriptionStatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        PAST_DUE = "past_due", "Past Due"

    class LastPaymentStatusChoices(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        UNPAID = "unpaid", "Unpaid"
        FAILED = "failed", "Failed"
        NONE = "none", "None"

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
        choices=SubscriptionStatusChoices.choices, 
        default=SubscriptionStatusChoices.ACTIVE)
    is_auto_renewal = models.BooleanField(default=True)
    last_payment_status = models.CharField(
        max_length=100, 
        choices=LastPaymentStatusChoices.choices, 
        default=LastPaymentStatusChoices.NONE
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

    def check_plan_premium(self) -> bool:
        return self.subscription_plan.get_name() != "Free"
    
    def check_access(self, feature: str) -> bool:
        if self.status != self.SubscriptionStatusChoices.ACTIVE:
            return False
        return self.subscription_plan.check_access(feature)
    
    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: subscription_plan, status, is_auto_renewal,
        start_date, next_billing_date, last_billing_date, provider,
        external_subscription_id, external_customer_id, last_payment_status"""
        allowed_fields = [
            "subscription_plan", 
            "status", 
            "is_auto_renewal",
            "last_payment_status",
            "start_date", 
            "next_billing_date", 
            "last_billing_date",
            "provider", 
            "external_subscription_id", 
            "external_customer_id",
        ]
        update_instance(self, allowed_fields, **metadata)

    def toggle_auto_renewal(self) -> None:
        self.is_auto_renewal = not self.is_auto_renewal
        self.save(update_fields=["is_auto_renewal"])

    def change_plan(self, subscription_plan: SubscriptionPlan):
        self.subscription_plan = subscription_plan
        self.status = self.SubscriptionStatusChoices.ACTIVE
        self.is_auto_renewal = True

    def set_free_plan(self):
        self.subscription_plan = SubscriptionPlan.objects.get(name="Free")
        self.status = self.SubscriptionStatusChoices.ACTIVE
        self.is_auto_renewal = True
        self.start_date = timezone.now()
        self.next_billing_date = None
        self.last_billing_date = None
        self.provider = PaymentProviderChoices.NONE
        self.external_subscription_id = ""
        self.external_customer_id = ""
        self.update_metadata(
            subscription_plan=self.subscription_plan,
            status=self.status,
            is_auto_renewal=self.is_auto_renewal,
            start_date=self.start_date,
            next_billing_date=self.next_billing_date,
            last_billing_date=self.last_billing_date,
            provider=self.provider,
            external_subscription_id=self.external_subscription_id,
            external_customer_id=self.external_customer_id
        )
        
    def set_past_due(self):
        self.status = self.SubscriptionStatusChoices.PAST_DUE
        self.save(update_fields=["status"])

    def renew(self, last_billing_date, next_billing_date):
        self.status = self.SubscriptionStatusChoices.ACTIVE
        self.last_billing_date = last_billing_date
        self.next_billing_date = next_billing_date
        self.save(update_fields=["status", "last_billing_date", "next_billing_date"])
        

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
    
    def get_created_at(self) -> datetime:
        return self.created_at
    
    def get_paid_at(self) -> datetime:
        return self.paid_at
    
    def get_provider(self) -> str:
        return self.provider
    
    def get_plan_name(self) -> str:
        return self.subscription_plan.get_name()
    
    def check_success(self) -> bool:
        return self.status == self.StatusChoices.SUCCESS
    
    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: reader, subscription_plan"""
        allowed_fields = ["reader", "subscription_plan",]
        update_instance(self, allowed_fields, **metadata)
    