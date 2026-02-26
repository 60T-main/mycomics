import hashlib
import uuid

from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import AnonymousProfile

ANON_COOKIE_NAME = "anon_token"
ANON_HEADER_META_KEY = "HTTP_X_ANONYMOUS_TOKEN"


def _hash_value(value: str) -> str:
	seed = f"{settings.SECRET_KEY}:{value}".encode("utf-8")
	return hashlib.sha256(seed).hexdigest()


def get_client_ip(request) -> str:
	xff = request.META.get("HTTP_X_FORWARDED_FOR")
	if xff:
		return xff.split(",")[0].strip()
	return request.META.get("REMOTE_ADDR", "") or "unknown"


def get_user_agent(request) -> str:
	return request.META.get("HTTP_USER_AGENT", "") or "unknown"


def get_anon_token(request) -> str | None:
	return request.COOKIES.get(ANON_COOKIE_NAME) or request.META.get(
		ANON_HEADER_META_KEY
	)


def _profile_matches_request(profile: AnonymousProfile, request) -> bool:
	ip_hash = _hash_value(get_client_ip(request))
	ua_hash = _hash_value(get_user_agent(request))
	return profile.ip_hash == ip_hash and profile.ua_hash == ua_hash


def get_anon_profile(request) -> AnonymousProfile | None:
	token = get_anon_token(request)
	if not token:
		return None
	try:
		profile = AnonymousProfile.objects.get(token=token)
	except AnonymousProfile.DoesNotExist:
		return None
	if not _profile_matches_request(profile, request):
		return None
	return profile


def find_profile_by_fingerprint(request) -> AnonymousProfile | None:
	ip_hash = _hash_value(get_client_ip(request))
	ua_hash = _hash_value(get_user_agent(request))
	return AnonymousProfile.objects.filter(ip_hash=ip_hash, ua_hash=ua_hash).first()


def can_anon_create(request, counter_field: str) -> bool:
	profile = get_anon_profile(request)
	if profile:
		return getattr(profile, counter_field) < 1
	fingerprint_profile = find_profile_by_fingerprint(request)
	if not fingerprint_profile:
		return True
	return getattr(fingerprint_profile, counter_field) < 1


def ensure_anon_profile(request) -> tuple[AnonymousProfile, bool]:
	profile = get_anon_profile(request)
	if profile:
		profile.last_seen_at = timezone.now()
		profile.save(update_fields=["last_seen_at"])
		return profile, False
	fingerprint_profile = find_profile_by_fingerprint(request)
	if fingerprint_profile:
		fingerprint_profile.last_seen_at = timezone.now()
		fingerprint_profile.save(update_fields=["last_seen_at"])
		return fingerprint_profile, False
	profile = AnonymousProfile.objects.create(
		token=uuid.uuid4(),
		ip_hash=_hash_value(get_client_ip(request)),
		ua_hash=_hash_value(get_user_agent(request)),
		last_seen_at=timezone.now(),
	)
	return profile, True


def set_anon_cookie(response, token: uuid.UUID) -> None:
	response.set_cookie(
		ANON_COOKIE_NAME,
		str(token),
		httponly=True,
		samesite="Lax",
	)


class PagesPermission(BasePermission):
	def has_permission(self, request, view) -> bool:
		return bool(request.user and request.user.is_authenticated)


class CharacterPermission(BasePermission):
	def has_permission(self, request, view) -> bool:
		if request.method in SAFE_METHODS:
			return True
		if request.user and request.user.is_authenticated:
			return True
		if request.method == "POST":
			return can_anon_create(request, "character_creations")
		if request.method in {"PUT", "PATCH"}:
			return False
		return request.method == "DELETE"

	def has_object_permission(self, request, view, obj) -> bool:
		if request.method in SAFE_METHODS:
			return True
		if request.user and request.user.is_authenticated:
			return True
		if request.method == "DELETE":
			profile = get_anon_profile(request)
			return profile and str(obj.created_by_anon_token) == str(profile.token)
		return False


class CharacterVersionPermission(BasePermission):
	def has_permission(self, request, view) -> bool:
		if request.method in SAFE_METHODS:
			return True
		if request.user and request.user.is_authenticated:
			return True
		if request.method == "POST":
			return False
		if request.method in {"PUT", "PATCH"}:
			return False
		return request.method == "DELETE"

	def has_object_permission(self, request, view, obj) -> bool:
		if request.method in SAFE_METHODS:
			return True
		if request.user and request.user.is_authenticated:
			return True
		if request.method == "DELETE":
			profile = get_anon_profile(request)
			return profile and str(obj.character.created_by_anon_token) == str(
				profile.token
			)
		return False


class CoverVersionPermission(BasePermission):
	def has_permission(self, request, view) -> bool:
		if request.method in SAFE_METHODS:
			return True
		if request.user and request.user.is_authenticated:
			return True
		if request.method == "POST":
			return False
		if request.method in {"PUT", "PATCH"}:
			return False
		return request.method == "DELETE"

	def has_object_permission(self, request, view, obj) -> bool:
		if request.method in SAFE_METHODS:
			return True
		if request.user and request.user.is_authenticated:
			return True
		if request.method == "DELETE":
			profile = get_anon_profile(request)
			return profile and str(obj.created_by_anon_token) == str(profile.token)
		return False
