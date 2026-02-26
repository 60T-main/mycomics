from django.urls import path

from . import views

urlpatterns = [
	path("tiers/", views.pricing_tiers, name="billing-pricing-tiers"),
	path("ledger/", views.ledger_entries, name="billing-ledger-entries"),
]
