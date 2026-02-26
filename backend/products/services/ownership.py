import uuid

from django.db import transaction
from django.utils import timezone

from customers.models import Address
from orders.models import Order
from products.models import AnonymousProfile, Book, Character, CoverVersion


def _parse_token(token_value):
	if not token_value:
		return None
	try:
		return uuid.UUID(str(token_value))
	except ValueError:
		return None


def claim_anonymous_data(customer, anon_token):
	"""
	Move anonymous data tied to anon_token onto the given customer.

	Returns a dict with updated row counts.
	"""
	token_str = str(anon_token)
	token_uuid = _parse_token(anon_token)
	if not token_uuid:
		return {
			"books": 0,
			"characters": 0,
			"cover_versions": 0,
			"addresses": 0,
			"orders": 0,
		}

	with transaction.atomic():
		books_updated = Book.objects.filter(session_key=token_str).update(
			user=customer,
			session_key=None,
		)
		characters_updated = Character.objects.filter(
			created_by_anon_token=token_uuid
		).update(
			user=customer,
			created_by_anon_token=None,
		)
		cover_versions_updated = CoverVersion.objects.filter(
			created_by_anon_token=token_uuid
		).update(
			created_by_user=customer,
			created_by_anon_token=None,
		)
		addresses_updated = Address.objects.filter(session_key=token_str).update(
			user=customer,
			session_key=None,
		)
		orders_updated = Order.objects.filter(session_key=token_str).update(
			customer=customer,
			session_key=None,
			claimed_at=timezone.now(),
		)
		AnonymousProfile.objects.filter(token=token_uuid).update(
			last_seen_at=timezone.now()
		)

	return {
		"books": books_updated,
		"characters": characters_updated,
		"cover_versions": cover_versions_updated,
		"addresses": addresses_updated,
		"orders": orders_updated,
	}
