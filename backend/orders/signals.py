from django.db.models.signals import post_save
from django.dispatch import receiver

from orders.models import Order
from products.services.ownership import claim_anonymous_data


@receiver(post_save, sender=Order)
def claim_anonymous_data_on_paid(sender, instance, **kwargs):
	if instance.status != "paid":
		return
	if not instance.customer:
		return
	if not instance.session_key:
		return
	claim_anonymous_data(instance.customer, instance.session_key)
