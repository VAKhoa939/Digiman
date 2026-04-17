from django.contrib import admin

from ..models.subscription_models import SubscriptionPlan, ReaderSubscription, PaymentTransaction
from .mixins import LogUserMixin

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(LogUserMixin, admin.ModelAdmin):
    list_display = [
        'get_display_name', 
        'name', 
        'price_usd', 
        'frequency', 
        'updated_at',
    ]
    ordering = ('price_usd',)
    fields = (
        'id',
        'name',
        'price_usd',
        'description',
        'features',
        'frequency',
        'stripe_price_id',
        'updated_at',
    )
    readonly_fields = ('id', 'updated_at',)
    

    def get_display_name(self, obj: SubscriptionPlan) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ReaderSubscription)
class ReaderSubscriptionAdmin(LogUserMixin, admin.ModelAdmin):
    list_display = [
        'get_display_name', 
        'reader', 
        'subscription_plan', 
        'provider',
        'start_date', 
        'next_billing_date', 
        'status',
    ]
    list_filter = (
        'reader', 
        'subscription_plan', 
        'provider',
        'status',
    )
    ordering = ('-start_date',)
    fields = (
        'id',
        'reader',
        'subscription_plan',
        'start_date',
        'next_billing_date',
        'last_billing_date',
        'is_auto_renewal',
        'status',
        'provider',
        'get_masked_external_subscription_id',
    )

    def get_display_name(self, obj: ReaderSubscription) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"

    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(LogUserMixin, admin.ModelAdmin):
    list_display = [
        'get_display_name', 
        'created_at',
        'paid_at',
        'transaction_type',
        'amount_usd', 
        'status',
        'provider',
    ]
    list_filter = ('transaction_type', 'status', 'provider',)
    ordering = ('-created_at',)
    fields = (
        'id',
        'reader',
        'subscription_plan',
        'transaction_type',
        'amount_usd',
        'status',
        'created_at',
        'paid_at',
        'provider',
        'external_transaction_id',
    )

    def get_display_name(self, obj: PaymentTransaction) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"

    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
