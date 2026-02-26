import re
import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

from customers.models import Customer


def _normalize_username(value: str) -> str:
	base = re.sub(r"[^a-zA-Z0-9]+", "", value).lower()
	return base or "user"


def _generate_unique_username(seed: str) -> str:
	base = _normalize_username(seed)
	candidate = base
	while Customer.objects.filter(username=candidate).exists():
		suffix = secrets.token_hex(2)
		candidate = f"{base}{suffix}"
	return candidate


def _generate_temp_password() -> str:
	return secrets.token_urlsafe(12)


def _send_temp_password_email(email: str, temp_password: str) -> None:
	send_mail(
		subject="temporary password",
		message=(
			"Thanks for your purchase. We created an account for you.\n\n"
			f"Temporary password: {temp_password}\n\n"
			"Please log in and change your password."
		),
		from_email=settings.EMAIL_HOST_USER,
		recipient_list=[email],
		fail_silently=False,
	)


def get_or_create_customer_from_contact(email: str, phone: str | None) -> tuple[Customer, bool, str | None]:
	if not email:
		raise ValueError("Email is required to create an account.")

	existing = Customer.objects.filter(email=email).first()
	if existing:
		return existing, False, None

	username = _generate_unique_username(email.split("@", 1)[0])
	temp_password = _generate_temp_password()

	with transaction.atomic():
		customer = Customer(
			username=username,
			email=email,
			phone=phone,
		)
		customer.set_password(temp_password)
		customer.save()

	_send_temp_password_email(email, temp_password)
	return customer, True, temp_password
