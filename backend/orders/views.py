from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from customers.models import Customer, Address
from orders.models import Order, OrderItem, RetryPackOrder
from orders.services.registration import get_or_create_customer_from_contact
from products.models import Book, Character, Page


def _webhook_secret_valid(request) -> bool:
	secret = getattr(settings, "PAYMENT_WEBHOOK_SECRET", "")
	if not secret:
		return True
	provided = request.headers.get("X-Webhook-Secret") or request.META.get(
		"HTTP_X_WEBHOOK_SECRET"
	)
	return provided == secret


@api_view(["POST"])
@permission_classes([AllowAny])
def payment_webhook(request):
	if not _webhook_secret_valid(request):
		return Response(
			{"detail": "Invalid webhook secret."},
			status=status.HTTP_401_UNAUTHORIZED,
		)

	order_id = request.data.get("order_id")
	customer_id = request.data.get("customer_id")
	transaction_id = request.data.get("transaction_id")
	status_value = request.data.get("status", "paid")

	if not order_id:
		return Response(
			{"detail": "order_id is required."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	if status_value != "paid":
		return Response(
			{"detail": "Only paid status is supported."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	order = get_object_or_404(Order, order_id=order_id)
	if order.customer_id and customer_id:
		if str(order.customer_id) != str(customer_id):
			return Response(
				{"detail": "Customer does not match order."},
				status=status.HTTP_409_CONFLICT,
			)

	if not order.customer_id:
		if customer_id:
			customer = get_object_or_404(Customer, id=customer_id)
		else:
			address = order.delivery_address
			try:
				customer, created, _ = get_or_create_customer_from_contact(
					address.email,
					address.phone,
				)
			except ValueError as exc:
				return Response(
					{"detail": str(exc)},
					status=status.HTTP_400_BAD_REQUEST,
				)
		order.customer = customer

	order.status = "paid"
	order.paid_at = timezone.now()
	if transaction_id is not None:
		order.transaction_id = transaction_id
	order.save()

	return Response(
		{"order_id": order.order_id, "status": order.status},
		status=status.HTTP_200_OK,
	)


@api_view(["POST"])
@permission_classes([AllowAny])
def create_order(request):
	items = request.data.get("items")
	tier_name = request.data.get("tier_name")
	delivery_address_id = request.data.get("delivery_address_id")
	delivery_cost = request.data.get("delivery_cost", 0)
	total_amount = request.data.get("total_amount", 0)

	if not tier_name or not delivery_address_id or not items:
		return Response(
			{"detail": "tier_name, delivery_address_id, and items are required."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if not isinstance(items, list):
		return Response(
			{"detail": "items must be a list."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	user = request.user if request.user.is_authenticated else None
	anon_token = None
	if not user:
		anon_token = request.COOKIES.get("anon_token") or request.META.get(
			"HTTP_X_ANONYMOUS_TOKEN"
		)
		if not anon_token:
			return Response(
				{"detail": "Anonymous token required."},
				status=status.HTTP_400_BAD_REQUEST,
			)

	address = get_object_or_404(Address, id=delivery_address_id)
	if user:
		if address.user_id != user.id:
			return Response(
				{"detail": "Delivery address does not belong to user."},
				status=status.HTTP_403_FORBIDDEN,
			)
	else:
		if address.session_key != anon_token:
			return Response(
				{"detail": "Delivery address does not belong to anonymous user."},
				status=status.HTTP_403_FORBIDDEN,
			)

	validated_items = []
	for item in items:
		book_id = item.get("book_id")
		quantity = item.get("quantity", 1)
		unit_price = item.get("unit_price")
		if not book_id or unit_price is None:
			return Response(
				{"detail": "Each item requires book_id and unit_price."},
				status=status.HTTP_400_BAD_REQUEST,
			)
		book = get_object_or_404(Book, id=book_id)
		if user:
			if book.user_id != user.id:
				return Response(
					{"detail": "Book does not belong to user."},
					status=status.HTTP_403_FORBIDDEN,
				)
		else:
			if book.session_key != anon_token:
				return Response(
					{"detail": "Book does not belong to anonymous user."},
					status=status.HTTP_403_FORBIDDEN,
				)
		validated_items.append((book, quantity, unit_price))

	with transaction.atomic():
		order = Order.objects.create(
			customer=user,
			session_key=None if user else anon_token,
			tier_name=tier_name,
			delivery_address=address,
			delivery_cost=delivery_cost,
			total_amount=total_amount,
			status="pending",
		)
		for book, quantity, unit_price in validated_items:
			OrderItem.objects.create(
				order=order,
				book=book,
				quantity=quantity,
				unit_price=unit_price,
			)

	return Response(
		{"order_id": order.order_id, "status": order.status},
		status=status.HTTP_201_CREATED,
	)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_retry_pack_order(request):
	content_type = request.data.get("content_type")
	content_id = request.data.get("content_id")

	if not content_type or not content_id:
		return Response(
			{"detail": "content_type and content_id are required."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	content_type = content_type.upper()
	if content_type not in {"CHARACTER", "COVER", "PAGE"}:
		return Response(
			{"detail": "Invalid content_type."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if content_type == "CHARACTER":
		item = get_object_or_404(Character, pk=content_id)
		book = item.book
	elif content_type == "COVER":
		book = get_object_or_404(Book, pk=content_id)
	else:
		item = get_object_or_404(Page, pk=content_id)
		book = item.book

	if book.user_id != request.user.id:
		return Response(
			{"detail": "You do not have permission to update this book."},
			status=status.HTTP_403_FORBIDDEN,
		)

	order = Order.objects.create(
		customer=request.user,
		session_key=None,
		tier_name="retry_pack",
		delivery_address=None,
		delivery_cost=0,
		total_amount=2,
		status="pending",
	)

	retry_pack = RetryPackOrder.objects.create(
		order=order,
		content_type=content_type,
		content_id=content_id,
	)

	return Response(
		{
			"order_id": order.order_id,
			"retry_pack_order_id": str(retry_pack.id),
			"pack_size": retry_pack.pack_size,
			"pack_price_gel": str(retry_pack.pack_price_gel),
		},
		status=status.HTTP_201_CREATED,
	)
