from orders.models import OrderItem
from billing.models import PricingTier
from products.models import RetryAllowance


def get_tier_for_book(user, book):
	order_item = (
		OrderItem.objects.select_related("order")
		.filter(book=book, order__customer=user, order__status="paid")
		.order_by("-order__paid_at", "-order__order_date")
		.first()
	)
	if not order_item:
		return None

	tier_code = order_item.order.tier_name
	tier = PricingTier.objects.filter(code__iexact=tier_code).first()
	if not tier:
		tier = PricingTier.objects.filter(name__iexact=tier_code).first()
	return tier


def get_tier_limit_for_book(user, book) -> int | None:
	tier = get_tier_for_book(user, book)
	if not tier:
		return None
	return tier.max_retries_per_unit


def is_book_paid(user, book) -> bool:
	return get_tier_for_book(user, book) is not None


def serialize_tier(tier):
	if not tier:
		return None
	return {
		"id": str(tier.id),
		"name": tier.name,
		"code": tier.code,
		"price": str(tier.price),
		"currency": tier.currency,
		"max_retries_per_unit": tier.max_retries_per_unit,
	}


def _get_or_create_allowance(user, content_type, content_id, base_limit):
	allowance, created = RetryAllowance.objects.get_or_create(
		user=user,
		content_type=content_type,
		content_id=content_id,
		defaults={"max_retries": base_limit or 0, "used_retries": 0},
	)
	if not created and base_limit is not None:
		if allowance.max_retries < base_limit:
			allowance.max_retries = base_limit
			allowance.save(update_fields=["max_retries", "updated_at"])
	return allowance


def consume_retry(user, content_type, content_id, base_limit) -> tuple[bool, RetryAllowance]:
	if base_limit is None:
		allowance = _get_or_create_allowance(user, content_type, content_id, 0)
		return False, allowance

	allowance = _get_or_create_allowance(user, content_type, content_id, base_limit)
	if allowance.used_retries >= allowance.max_retries:
		return False, allowance
	allowance.used_retries += 1
	allowance.save(update_fields=["used_retries", "updated_at"])
	return True, allowance


def add_extra_retries(user, content_type, content_id, base_limit, extra_count=3) -> RetryAllowance:
	if base_limit is None:
		raise ValueError("No paid tier found for this item.")
	allowance = _get_or_create_allowance(user, content_type, content_id, base_limit)
	allowance.max_retries += extra_count
	allowance.save(update_fields=["max_retries", "updated_at"])
	return allowance
