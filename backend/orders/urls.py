from django.urls import path

from . import views

urlpatterns = [
	path("create/", views.create_order, name="orders-create"),
	path("payment/webhook/", views.payment_webhook, name="orders-payment-webhook"),
	path("retry-pack/create/", views.create_retry_pack_order, name="retry-pack-create"),
]
