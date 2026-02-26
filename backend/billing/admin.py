from django.contrib import admin

from .models import PricingTier


@admin.register(PricingTier)
class PricingTierAdmin(admin.ModelAdmin):
	list_display = ("name", "code", "price", "currency", "max_retries_per_unit", "is_active")
	list_filter = ("is_active", "currency")
	search_fields = ("name", "code")
