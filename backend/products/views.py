from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
	Book,
	Character,
	CharacterVersion,
	CoverVersion,
	Page,
	PageVersion,
)
from .serializers import (
	BookSerializer,
	CharacterSerializer,
	CharacterVersionSerializer,
	CoverVersionSerializer,
	PageSerializer,
	PageVersionSerializer,
)
from .permissions import (
	CharacterPermission,
	CharacterVersionPermission,
	CoverVersionPermission,
	PagesPermission,
	can_anon_create,
	ensure_anon_profile,
	get_anon_profile,
	set_anon_cookie,
)
from .services.retries import (
	add_extra_retries,
	consume_retry,
	get_tier_for_book,
	get_tier_limit_for_book,
	serialize_tier,
)
from .services.generate_page import generate_page
from orders.models import RetryPackOrder
from orders.models import OrderItem


def _build_unique_book_slug(title, *, user=None, session_key=None, exclude_id=None):
	base_slug = slugify(title or "", allow_unicode=True) or "book"
	queryset = Book.objects.all()

	if user is not None:
		queryset = queryset.filter(user=user)
	elif session_key:
		queryset = queryset.filter(session_key=session_key)

	if exclude_id is not None:
		queryset = queryset.exclude(id=exclude_id)

	slug = base_slug
	suffix = 2
	while queryset.filter(slug=slug).exists():
		slug = f"{base_slug}-{suffix}"
		suffix += 1

	return slug


def _enforce_object_permissions(request, instance, perms):
	for perm_cls in perms:
		perm = perm_cls()
		if hasattr(perm, "has_object_permission"):
			if not perm.has_object_permission(request, None, instance):
				return Response(
					{"detail": "You do not have permission to perform this action."},
					status=status.HTTP_403_FORBIDDEN,
				)
	return None



def _list_create_view(model_cls, serializer_cls, perms=None):
	permission_set = perms or [AllowAny]
	@api_view(["GET", "POST"])
	@permission_classes(permission_set)
	def view(request):
		if request.method == "GET":
			queryset = model_cls.objects.all()
			serializer = serializer_cls(queryset, many=True)
			return Response(serializer.data)

		serializer = serializer_cls(data=request.data)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	return view


def _detail_view(model_cls, serializer_cls, perms=None):
	permission_set = perms or [AllowAny]
	@api_view(["GET", "PUT", "PATCH", "DELETE"])
	@permission_classes(permission_set)
	def view(request, item_id):
		instance = get_object_or_404(model_cls, pk=item_id)
		permission_error = _enforce_object_permissions(request, instance, permission_set)
		if permission_error:
			return permission_error

		if request.method == "GET":
			serializer = serializer_cls(instance)
			return Response(serializer.data)

		if request.method in {"PUT", "PATCH"}:
			serializer = serializer_cls(
				instance,
				data=request.data,
				partial=request.method == "PATCH",
			)
			if serializer.is_valid():
				serializer.save()
				return Response(serializer.data)
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

		instance.delete()
		return Response(status=status.HTTP_204_NO_CONTENT)

	return view


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def book_list_create(request):
	if request.method == "GET":
		if request.user and request.user.is_authenticated:
			queryset = Book.objects.filter(user=request.user)
		else:
			profile = get_anon_profile(request)
			if not profile:
				return Response([])
			queryset = Book.objects.filter(session_key=str(profile.token))
		serializer = BookSerializer(queryset, many=True)
		return Response(serializer.data)

	serializer = BookSerializer(data=request.data)
	if not serializer.is_valid():
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	incoming_slug = serializer.validated_data.get("slug")
	title = serializer.validated_data.get("title", "")

	if request.user and request.user.is_authenticated:
		resolved_slug = (incoming_slug or "").strip() or _build_unique_book_slug(
			title,
			user=request.user,
		)
		instance = serializer.save(user=request.user, slug=resolved_slug)
		return Response(BookSerializer(instance).data, status=status.HTTP_201_CREATED)

	if not can_anon_create(request, "book_creations"):
		return Response(
			{"detail": "Anonymous users can only create one book."},
			status=status.HTTP_403_FORBIDDEN,
		)
	profile, created = ensure_anon_profile(request)
	resolved_slug = (incoming_slug or "").strip() or _build_unique_book_slug(
		title,
		session_key=str(profile.token),
	)
	instance = serializer.save(session_key=str(profile.token), slug=resolved_slug)
	profile.book_creations += 1
	profile.save(update_fields=["book_creations", "last_seen_at"])
	response = Response(BookSerializer(instance).data, status=status.HTTP_201_CREATED)
	if created:
		set_anon_cookie(response, profile.token)
	return response


def _attach_pricing_tier_to_book(data, request):
	if not request.user.is_authenticated:
		data["pricing_tier"] = None
		return data
	book = Book.objects.filter(id=data.get("id")).first()
	if not book:
		data["pricing_tier"] = None
		return data
	tier = get_tier_for_book(request.user, book)
	data["pricing_tier"] = serialize_tier(tier)
	return data


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def book_detail(request, item_id):
	instance = get_object_or_404(Book, pk=item_id)
	if request.user and request.user.is_authenticated:
		if instance.user_id != request.user.id:
			return Response(
				{"detail": "You do not have permission to access this book."},
				status=status.HTTP_403_FORBIDDEN,
			)
	else:
		profile = get_anon_profile(request)
		if not profile or instance.session_key != str(profile.token):
			return Response(
				{"detail": "You do not have permission to access this book."},
				status=status.HTTP_403_FORBIDDEN,
			)

	if request.method == "GET":
		serializer = BookSerializer(instance)
		data = _attach_pricing_tier_to_book(serializer.data, request)
		return Response(data)

	if request.method in {"PUT", "PATCH"}:
		serializer = BookSerializer(
			instance,
			data=request.data,
			partial=request.method == "PATCH",
		)
		if serializer.is_valid():
			incoming_slug = serializer.validated_data.get("slug")
			title = serializer.validated_data.get("title", instance.title)

			if request.user and request.user.is_authenticated:
				owner_user = request.user
				owner_session = None
			else:
				owner_user = None
				owner_session = instance.session_key

			resolved_slug = (incoming_slug or "").strip() or _build_unique_book_slug(
				title,
				user=owner_user,
				session_key=owner_session,
				exclude_id=instance.id,
			)
			serializer.save(slug=resolved_slug)
			return Response(serializer.data)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	instance.delete()
	return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@permission_classes([CharacterPermission])
def character_list_create(request):
	if request.method == "GET":
		queryset = Character.objects.all()
		serializer = CharacterSerializer(queryset, many=True)
		return Response(serializer.data)

	serializer = CharacterSerializer(data=request.data)
	if not serializer.is_valid():
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	book = serializer.validated_data.get("book")
	if request.user and request.user.is_authenticated:
		if book.user_id != request.user.id:
			return Response(
				{"detail": "You do not have permission to update this book."},
				status=status.HTTP_403_FORBIDDEN,
			)
		instance = serializer.save(user=request.user)
		return Response(CharacterSerializer(instance).data, status=status.HTTP_201_CREATED)

	profile, created = ensure_anon_profile(request)
	if book.session_key != str(profile.token):
		return Response(
			{"detail": "You do not have permission to update this book."},
			status=status.HTTP_403_FORBIDDEN,
		)
	instance = serializer.save(created_by_anon_token=profile.token)
	profile.character_creations += 1
	profile.save(update_fields=["character_creations", "last_seen_at"])
	response = Response(CharacterSerializer(instance).data, status=status.HTTP_201_CREATED)
	if created:
		set_anon_cookie(response, profile.token)
	return response


character_detail = _detail_view(Character, CharacterSerializer, [CharacterPermission])


@api_view(["GET", "POST"])
@permission_classes([CharacterVersionPermission])
def character_version_list_create(request):
	if request.method == "GET":
		queryset = CharacterVersion.objects.all()
		serializer = CharacterVersionSerializer(queryset, many=True)
		return Response(serializer.data)

	serializer = CharacterVersionSerializer(data=request.data)
	if not serializer.is_valid():
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	character = serializer.validated_data.get("character")
	if request.user and request.user.is_authenticated:
		if character.user_id != request.user.id:
			return Response(
				{"detail": "You do not have permission to update this character."},
				status=status.HTTP_403_FORBIDDEN,
			)
		tier = get_tier_for_book(request.user, character.book)
		base_limit = get_tier_limit_for_book(request.user, character.book)
		allowed, allowance = consume_retry(
			request.user,
			"CHARACTER",
			character.id,
			base_limit,
		)
		if not allowed:
			return Response(
				{
					"detail": "Retry limit reached for this character.",
					"max_retries": allowance.max_retries,
					"used_retries": allowance.used_retries,
					"pricing_tier": serialize_tier(tier),
				},
				status=status.HTTP_403_FORBIDDEN,
			)
		last_version = (
			CharacterVersion.objects.filter(character=character)
			.order_by("-version_number")
			.first()
		)
		next_version = (last_version.version_number if last_version else 0) + 1
		instance = serializer.save(version_number=next_version)
		return Response(
			{
				**CharacterVersionSerializer(instance).data,
				"pricing_tier": serialize_tier(tier),
			},
			status=status.HTTP_201_CREATED,
		)

	profile = get_anon_profile(request)
	if not profile or str(character.created_by_anon_token) != str(profile.token):
		return Response(
			{"detail": "You do not have permission to update this character."},
			status=status.HTTP_403_FORBIDDEN,
		)
	profile, created = ensure_anon_profile(request)
	last_version = (
		CharacterVersion.objects.filter(character=character)
		.order_by("-version_number")
		.first()
	)
	next_version = (last_version.version_number if last_version else 0) + 1
	instance = serializer.save(version_number=next_version)
	profile.character_generations += 1
	profile.save(update_fields=["character_generations", "last_seen_at"])
	response = Response(
		CharacterVersionSerializer(instance).data,
		status=status.HTTP_201_CREATED,
	)
	if created:
		set_anon_cookie(response, profile.token)
	return response


character_version_detail = _detail_view(
	CharacterVersion, CharacterVersionSerializer, [CharacterVersionPermission]
)


@api_view(["GET", "POST"])
@permission_classes([CoverVersionPermission])
def cover_version_list_create(request):
	if request.method == "GET":
		queryset = CoverVersion.objects.all()
		serializer = CoverVersionSerializer(queryset, many=True)
		return Response(serializer.data)

	serializer = CoverVersionSerializer(data=request.data)
	if not serializer.is_valid():
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	book = serializer.validated_data.get("book")
	if request.user and request.user.is_authenticated:
		if book.user_id != request.user.id:
			return Response(
				{"detail": "You do not have permission to update this book."},
				status=status.HTTP_403_FORBIDDEN,
			)
		tier = get_tier_for_book(request.user, book)
		base_limit = get_tier_limit_for_book(request.user, book)
		allowed, allowance = consume_retry(
			request.user,
			"COVER",
			book.id,
			base_limit,
		)
		if not allowed:
			return Response(
				{
					"detail": "Retry limit reached for this cover.",
					"max_retries": allowance.max_retries,
					"used_retries": allowance.used_retries,
					"pricing_tier": serialize_tier(tier),
				},
				status=status.HTTP_403_FORBIDDEN,
			)
		last_version = (
			CoverVersion.objects.filter(book=book)
			.order_by("-version_number")
			.first()
		)
		next_version = (last_version.version_number if last_version else 0) + 1
		instance = serializer.save(created_by_user=request.user, version_number=next_version)
		return Response(
			{
				**CoverVersionSerializer(instance).data,
				"pricing_tier": serialize_tier(tier),
			},
			status=status.HTTP_201_CREATED,
		)

	profile = get_anon_profile(request)
	if not profile or book.session_key != str(profile.token):
		return Response(
			{"detail": "You do not have permission to update this book."},
			status=status.HTTP_403_FORBIDDEN,
		)
	profile, created = ensure_anon_profile(request)
	last_version = (
		CoverVersion.objects.filter(book=book)
		.order_by("-version_number")
		.first()
	)
	next_version = (last_version.version_number if last_version else 0) + 1
	instance = serializer.save(
		created_by_anon_token=profile.token,
		version_number=next_version,
	)
	profile.cover_generations += 1
	profile.save(update_fields=["cover_generations", "last_seen_at"])
	response = Response(
		CoverVersionSerializer(instance).data,
		status=status.HTTP_201_CREATED,
	)
	if created:
		set_anon_cookie(response, profile.token)
	return response


cover_version_detail = _detail_view(CoverVersion, CoverVersionSerializer, [CoverVersionPermission])


page_list_create = _list_create_view(Page, PageSerializer, [PagesPermission])
page_detail = _detail_view(Page, PageSerializer, [PagesPermission])


@api_view(["GET", "POST"])
@permission_classes([PagesPermission])
def page_version_list_create(request):
	if request.method == "GET":
		queryset = PageVersion.objects.all()
		serializer = PageVersionSerializer(queryset, many=True)
		return Response(serializer.data)

	serializer = PageVersionSerializer(data=request.data)
	if not serializer.is_valid():
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	page = serializer.validated_data.get("page")
	if request.user and request.user.is_authenticated:
		if page.book.user_id != request.user.id:
			return Response(
				{"detail": "You do not have permission to update this book."},
				status=status.HTTP_403_FORBIDDEN,
			)
		tier = get_tier_for_book(request.user, page.book)
		base_limit = get_tier_limit_for_book(request.user, page.book)
		allowed, allowance = consume_retry(
			request.user,
			"PAGE",
			page.id,
			base_limit,
		)
		if not allowed:
			return Response(
				{
					"detail": "Retry limit reached for this page.",
					"max_retries": allowance.max_retries,
					"used_retries": allowance.used_retries,
					"pricing_tier": serialize_tier(tier),
				},
				status=status.HTTP_403_FORBIDDEN,
			)
		order_item = (
			OrderItem.objects.select_related("order")
			.filter(book=page.book, order__customer=request.user, order__status="paid")
			.order_by("-order__paid_at", "-order__order_date")
			.first()
		)
		order = order_item.order if order_item else None
		page_version = generate_page(
			request.user,
			page.book,
			order,
			page.page_number,
			serializer.validated_data.get("prompt"),
		)
		return Response(
			{
				**PageVersionSerializer(page_version).data,
				"pricing_tier": serialize_tier(tier),
			},
			status=status.HTTP_201_CREATED,
		)

	return Response(
		{"detail": "Authentication required."},
		status=status.HTTP_401_UNAUTHORIZED,
	)


page_version_detail = _detail_view(PageVersion, PageVersionSerializer, [PagesPermission])


@api_view(["POST"])
@permission_classes([PagesPermission])
def add_retry_pack(request):
	content_type = request.data.get("content_type")
	content_id = request.data.get("content_id")
	retry_pack_order_id = request.data.get("retry_pack_order_id")

	if not content_type or not content_id or not retry_pack_order_id:
		return Response(
			{"detail": "content_type, content_id, and retry_pack_order_id are required."},
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

	retry_pack = get_object_or_404(RetryPackOrder, id=retry_pack_order_id)
	if retry_pack.order.customer_id != request.user.id:
		return Response(
			{"detail": "Retry pack does not belong to this user."},
			status=status.HTTP_403_FORBIDDEN,
		)
	if retry_pack.order.status != "paid":
		return Response(
			{"detail": "Retry pack order is not paid."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	if retry_pack.consumed_at:
		return Response(
			{"detail": "Retry pack already used."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	if retry_pack.content_type != content_type:
		return Response(
			{"detail": "Retry pack content type mismatch."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	if str(retry_pack.content_id) != str(
		book.id if content_type == "COVER" else item.id
	):
		return Response(
			{"detail": "Retry pack content item mismatch."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	base_limit = get_tier_limit_for_book(request.user, book)
	try:
		allowance = add_extra_retries(
			request.user,
			content_type,
			book.id if content_type == "COVER" else item.id,
			base_limit,
			extra_count=retry_pack.pack_size,
		)
	except ValueError as exc:
		return Response(
			{"detail": str(exc)},
			status=status.HTTP_400_BAD_REQUEST,
		)

	retry_pack.consumed_at = timezone.now()
	retry_pack.save(update_fields=["consumed_at"])

	return Response(
		{
			"content_type": allowance.content_type,
			"content_id": str(allowance.content_id),
			"max_retries": allowance.max_retries,
			"used_retries": allowance.used_retries,
			"pack_size": retry_pack.pack_size,
			"pack_price_gel": str(retry_pack.pack_price_gel),
		},
		status=status.HTTP_200_OK,
	)
