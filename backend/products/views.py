from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
	Book,
	Character,
	CharacterReferencePhoto,
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
	ensure_anon_profile,
	find_profile_by_fingerprint,
	get_anon_profile,
	get_anon_token,
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
from .services.generate_character import generate_character
from .services.generate_cover import generate_cover, generate_cover_anonymous
from orders.models import RetryPackOrder
from orders.models import OrderItem

FREE_TIER_CHARACTER_LIMIT = 3
PAID_TIER_CHARACTER_LIMIT = 5


def _get_related_book(instance):
	if isinstance(instance, Book):
		return instance
	if isinstance(instance, (Character, CoverVersion, Page)):
		return instance.book
	if isinstance(instance, CharacterVersion):
		return instance.character.book
	if isinstance(instance, PageVersion):
		return instance.page.book
	return None


def _permission_denied_response(detail="You do not have permission to update this book."):
	return Response({"detail": detail}, status=status.HTTP_403_FORBIDDEN)


class CharacterVersionPagination(PageNumberPagination):
	page_size = 20
	page_size_query_param = "page_size"
	max_page_size = 100


def _require_book_access(request, book, *, detail="You do not have permission to update this book."):
	if request.user and request.user.is_authenticated:
		if book.user_id != request.user.id:
			return _permission_denied_response(detail)
		return None

	profile = get_anon_profile(request)
	if not profile or book.session_key != str(profile.token):
		return _permission_denied_response(detail)
	return None


def _require_book_in_draft(book):
	if book.status != "DRAFT":
		return Response(
			{"detail": "Book is locked for edits and generation."},
			status=status.HTTP_409_CONFLICT,
		)
	return None


def _get_character_limit_for_book(request, book) -> int:
	if request.user and request.user.is_authenticated:
		tier = get_tier_for_book(request.user, book)
		if tier:
			return PAID_TIER_CHARACTER_LIMIT
	return FREE_TIER_CHARACTER_LIMIT


def _scoped_character_queryset(request):
	if request.user and request.user.is_authenticated:
		queryset = Character.objects.filter(book__user=request.user)
	else:
		profile = get_anon_profile(request)
		if not profile:
			return Character.objects.none()
		queryset = Character.objects.filter(book__session_key=str(profile.token))

	book_id = request.query_params.get("book_id")
	if book_id:
		queryset = queryset.filter(book_id=book_id)

	return queryset.prefetch_related("reference_photos").order_by("-created_at")


def _scoped_character_version_queryset(request):
	if request.user and request.user.is_authenticated:
		queryset = CharacterVersion.objects.filter(character__book__user=request.user)
	else:
		profile = get_anon_profile(request)
		if not profile:
			return CharacterVersion.objects.none()
		queryset = CharacterVersion.objects.filter(
			character__book__session_key=str(profile.token)
		)

	book_id = request.query_params.get("book_id")
	if book_id:
		queryset = queryset.filter(character__book_id=book_id)

	character_id = request.query_params.get("character") or request.query_params.get("character_id")
	if character_id:
		queryset = queryset.filter(character_id=character_id)

	return queryset.order_by("-created_at")


def _scoped_cover_version_queryset(request):
	if request.user and request.user.is_authenticated:
		queryset = CoverVersion.objects.filter(book__user=request.user)
	else:
		profile = get_anon_profile(request)
		if not profile:
			return CoverVersion.objects.none()
		queryset = CoverVersion.objects.filter(book__session_key=str(profile.token))

	book_id = request.query_params.get("book_id")
	if book_id:
		queryset = queryset.filter(book_id=book_id)

	return queryset.order_by("-created_at")


def _scoped_page_queryset(request):
	if request.user and request.user.is_authenticated:
		queryset = Page.objects.filter(book__user=request.user)
	else:
		profile = get_anon_profile(request)
		if not profile:
			return Page.objects.none()
		queryset = Page.objects.filter(book__session_key=str(profile.token))

	book_id = request.query_params.get("book_id")
	if book_id:
		queryset = queryset.filter(book_id=book_id)

	return queryset.order_by("page_number")


def _scoped_page_version_queryset(request):
	if request.user and request.user.is_authenticated:
		queryset = PageVersion.objects.filter(page__book__user=request.user)
	else:
		profile = get_anon_profile(request)
		if not profile:
			return PageVersion.objects.none()
		queryset = PageVersion.objects.filter(page__book__session_key=str(profile.token))

	book_id = request.query_params.get("book_id")
	if book_id:
		queryset = queryset.filter(page__book_id=book_id)

	page_id = request.query_params.get("page") or request.query_params.get("page_id")
	if page_id:
		queryset = queryset.filter(page_id=page_id)

	return queryset.order_by("-created_at")


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

		if request.method in {"PUT", "PATCH", "DELETE"}:
			related_book = _get_related_book(instance)
			if related_book is not None:
				draft_error = _require_book_in_draft(related_book)
				if draft_error:
					return draft_error

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

	profile, created = ensure_anon_profile(request)
	if profile.book_creations >= 1:
		response = Response(
			{"detail": "Anonymous users can only create one book."},
			status=status.HTTP_403_FORBIDDEN,
		)
		if created or not get_anon_token(request):
			set_anon_cookie(response, profile.token)
		return response

	resolved_slug = (incoming_slug or "").strip() or _build_unique_book_slug(
		title,
		session_key=str(profile.token),
	)
	instance = serializer.save(session_key=str(profile.token), slug=resolved_slug)
	profile.book_creations += 1
	profile.save(update_fields=["book_creations", "last_seen_at"])
	response = Response(BookSerializer(instance).data, status=status.HTTP_201_CREATED)
	if created or not get_anon_token(request):
		set_anon_cookie(response, profile.token)
	return response


def _get_latest_owner_draft(request):
	if request.user and request.user.is_authenticated:
		return (
			Book.objects.filter(user=request.user, status="DRAFT")
			.order_by("-created_at")
			.first(),
			None,
		)
	profile = get_anon_profile(request)
	recovered_by_fingerprint = False
	if not profile:
		profile = find_profile_by_fingerprint(request)
		recovered_by_fingerprint = bool(profile)
	if not profile:
		return None, None
	return (
		Book.objects.filter(session_key=str(profile.token), status="DRAFT")
		.order_by("-created_at")
		.first(),
		profile if recovered_by_fingerprint else None,
	)


def _build_init_create_payload(action, *, book=None):
	payload = {"action": action}
	if book is not None:
		payload["book"] = BookSerializer(book).data
	return payload


@ensure_csrf_cookie
@api_view(["GET"])
@permission_classes([AllowAny])
def book_init_create(request):
	existing_draft, recovered_profile = _get_latest_owner_draft(request)

	response = None
	if existing_draft:
		response = Response(_build_init_create_payload("resume", book=existing_draft))
	else:
		response = Response(_build_init_create_payload("needs_style"))

	if recovered_profile and not get_anon_token(request):
		set_anon_cookie(response, recovered_profile.token)

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
	access_error = _require_book_access(
		request,
		instance,
		detail="You do not have permission to access this book.",
	)
	if access_error:
		return access_error

	if request.method == "GET":
		serializer = BookSerializer(instance)
		data = _attach_pricing_tier_to_book(serializer.data, request)
		return Response(data)

	if request.method in {"PUT", "PATCH"}:
		draft_error = _require_book_in_draft(instance)
		if draft_error:
			return draft_error

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
		queryset = _scoped_character_queryset(request)
		serializer = CharacterSerializer(
			queryset,
			many=True,
			context={"request": request},
		)
		return Response(serializer.data)

	book_id = request.data.get("book_id")
	if not book_id:
		return Response(
			{"detail": "book_id is required."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	if request.data.get("book") and str(request.data.get("book")) != str(book_id):
		return Response(
			{"detail": "book and book_id must match."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	uploaded_reference_photos = request.FILES.getlist("reference_photos")
	legacy_reference_photo = request.FILES.get("reference_photo")

	if not uploaded_reference_photos and legacy_reference_photo:
		uploaded_reference_photos = [legacy_reference_photo]

	if len(uploaded_reference_photos) > 3:
		return Response(
			{"detail": "You can upload up to 3 reference photos."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	payload = {
		"book": str(book_id),
		"name": request.data.get("name"),
		"gender": request.data.get("gender"),
	}

	if uploaded_reference_photos:
		payload["reference_photo"] = uploaded_reference_photos[0]

	serializer = CharacterSerializer(data=payload)
	if not serializer.is_valid():
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	book = serializer.validated_data.get("book")
	access_error = _require_book_access(request, book)
	if access_error:
		return access_error
	draft_error = _require_book_in_draft(book)
	if draft_error:
		return draft_error

	character_limit = _get_character_limit_for_book(request, book)
	existing_character_count = Character.objects.filter(book=book).count()
	if existing_character_count >= character_limit:
		return Response(
			{
				"detail": f"Character limit reached for this book. Max allowed is {character_limit}.",
				"max_characters": character_limit,
				"current_characters": existing_character_count,
			},
			status=status.HTTP_403_FORBIDDEN,
		)

	if request.user and request.user.is_authenticated:
		instance = serializer.save(user=request.user)
		if uploaded_reference_photos:
			CharacterReferencePhoto.objects.bulk_create(
				[
					CharacterReferencePhoto(character=instance, image=photo)
					for photo in uploaded_reference_photos
				]
			)
		instance.refresh_from_db()
		return Response(
			CharacterSerializer(instance, context={"request": request}).data,
			status=status.HTTP_201_CREATED,
		)

	profile, created = ensure_anon_profile(request)
	instance = serializer.save(created_by_anon_token=profile.token)
	if uploaded_reference_photos:
		CharacterReferencePhoto.objects.bulk_create(
			[
				CharacterReferencePhoto(character=instance, image=photo)
				for photo in uploaded_reference_photos
			]
		)
	instance.refresh_from_db()
	profile.character_creations += 1
	profile.save(update_fields=["character_creations", "last_seen_at"])
	response = Response(
		CharacterSerializer(instance, context={"request": request}).data,
		status=status.HTTP_201_CREATED,
	)
	if created or not get_anon_token(request):
		set_anon_cookie(response, profile.token)
	return response


character_detail = _detail_view(Character, CharacterSerializer, [CharacterPermission])


@api_view(["GET", "POST"])
@permission_classes([CharacterVersionPermission])
def character_version_list_create(request):
	if request.method == "GET":
		queryset = _scoped_character_version_queryset(request)
		paginator = CharacterVersionPagination()
		page = paginator.paginate_queryset(queryset, request)
		serializer = CharacterVersionSerializer(page, many=True)
		return paginator.get_paginated_response(serializer.data)

	character_id = request.data.get("character")
	if not character_id:
		return Response(
			{"detail": "character is required."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	book_id = request.data.get("book_id")
	if not book_id:
		return Response(
			{"detail": "book_id is required."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	character = get_object_or_404(Character, pk=character_id)
	if str(character.book_id) != str(book_id):
		return Response(
			{"detail": "character does not belong to provided book_id."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	access_error = _require_book_access(request, character.book)
	if access_error:
		return access_error
	draft_error = _require_book_in_draft(character.book)
	if draft_error:
		return draft_error

	if request.user and request.user.is_authenticated:
		tier = get_tier_for_book(request.user, character.book)
		has_existing_versions = CharacterVersion.objects.filter(character=character).exists()
		if has_existing_versions:
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
		order_item = (
			OrderItem.objects.select_related("order")
			.filter(
				book=character.book,
				order__customer=request.user,
				order__status="paid",
			)
			.order_by("-order__paid_at", "-order__order_date")
			.first()
		)
		order = order_item.order if order_item else None
		prompt_snapshot = request.data.get("prompt_snapshot", request.data.get("prompt"))
		seed = request.data.get("seed")
		if seed == "":
			seed = None
		instance = generate_character(
			request.user,
			character,
			order,
			prompt_snapshot,
			aspect_ratio=request.data.get("aspect_ratio") or "2:3",
			seed=seed,
		)
		return Response(
			{
				**CharacterVersionSerializer(instance).data,
				"pricing_tier": serialize_tier(tier),
			},
			status=status.HTTP_201_CREATED,
		)

	profile = get_anon_profile(request)
	if not profile or character.book.session_key != str(profile.token):
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
	serializer = CharacterVersionSerializer(data=request.data)
	if not serializer.is_valid():
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
	instance = serializer.save(version_number=next_version)
	profile.character_generations += 1
	profile.save(update_fields=["character_generations", "last_seen_at"])
	response = Response(
		CharacterVersionSerializer(instance).data,
		status=status.HTTP_201_CREATED,
	)
	if created or not get_anon_token(request):
		set_anon_cookie(response, profile.token)
	return response


character_version_detail = _detail_view(
	CharacterVersion, CharacterVersionSerializer, [CharacterVersionPermission]
)


@api_view(["GET", "POST"])
@permission_classes([CoverVersionPermission])
def cover_version_list_create(request):
	if request.method == "GET":
		queryset = _scoped_cover_version_queryset(request)
		serializer = CoverVersionSerializer(queryset, many=True)
		return Response(serializer.data)

	book_id = request.data.get("book_id")
	if not book_id:
		return Response(
			{"detail": "book_id is required."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	if request.data.get("book") and str(request.data.get("book")) != str(book_id):
		return Response(
			{"detail": "book and book_id must match."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	book = get_object_or_404(Book, pk=book_id)
	access_error = _require_book_access(request, book)
	if access_error:
		return access_error
	draft_error = _require_book_in_draft(book)
	if draft_error:
		return draft_error

	if request.user and request.user.is_authenticated:
		tier = get_tier_for_book(request.user, book)
		has_existing_versions = CoverVersion.objects.filter(book=book).exists()
		if has_existing_versions:
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
		order_item = (
			OrderItem.objects.select_related("order")
			.filter(book=book, order__customer=request.user, order__status="paid")
			.order_by("-order__paid_at", "-order__order_date")
			.first()
		)
		order = order_item.order if order_item else None
		prompt_snapshot = request.data.get("prompt_snapshot", request.data.get("prompt"))
		seed = request.data.get("seed")
		if seed == "":
			seed = None
		instance = generate_cover(
			request.user,
			book,
			order,
			prompt_snapshot,
			title_text=request.data.get("title_text") or book.title,
			subtitle_text=request.data.get("subtitle_text"),
			author_name=request.data.get("author_name"),
			title_position=request.data.get("title_position"),
			aspect_ratio=request.data.get("aspect_ratio") or "2:3",
			seed=seed,
		)
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
	prompt_snapshot = request.data.get("prompt_snapshot", request.data.get("prompt"))
	seed = request.data.get("seed")
	if seed == "":
		seed = None
	instance = generate_cover_anonymous(
		profile.token,
		book,
		prompt_snapshot,
		title_text=request.data.get("title_text") or book.title,
		subtitle_text=request.data.get("subtitle_text"),
		author_name=request.data.get("author_name"),
		title_position=request.data.get("title_position"),
		aspect_ratio=request.data.get("aspect_ratio") or "2:3",
		seed=seed,
	)
	profile.cover_generations += 1
	profile.save(update_fields=["cover_generations", "last_seen_at"])
	response = Response(
		CoverVersionSerializer(instance).data,
		status=status.HTTP_201_CREATED,
	)
	if created or not get_anon_token(request):
		set_anon_cookie(response, profile.token)
	return response


cover_version_detail = _detail_view(CoverVersion, CoverVersionSerializer, [CoverVersionPermission])



@api_view(["GET", "POST"])
@permission_classes([PagesPermission])
def page_list_create(request):
	if request.method == "GET":
		queryset = _scoped_page_queryset(request)
		serializer = PageSerializer(queryset, many=True)
		return Response(serializer.data)

	book_id = request.data.get("book_id")
	if not book_id:
		return Response(
			{"detail": "book_id is required."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	if request.data.get("book") and str(request.data.get("book")) != str(book_id):
		return Response(
			{"detail": "book and book_id must match."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	book = get_object_or_404(Book, pk=book_id)
	access_error = _require_book_access(request, book)
	if access_error:
		return access_error
	draft_error = _require_book_in_draft(book)
	if draft_error:
		return draft_error

	payload = request.data.copy()
	payload["book"] = book_id
	serializer = PageSerializer(data=payload)
	if not serializer.is_valid():
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
	instance = serializer.save()
	return Response(PageSerializer(instance).data, status=status.HTTP_201_CREATED)


page_detail = _detail_view(Page, PageSerializer, [PagesPermission])


@api_view(["GET", "POST"])
@permission_classes([PagesPermission])
def page_version_list_create(request):
	if request.method == "GET":
		queryset = _scoped_page_version_queryset(request)
		serializer = PageVersionSerializer(queryset, many=True)
		return Response(serializer.data)

	book_id = request.data.get("book_id")
	if not book_id:
		return Response(
			{"detail": "book_id is required."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	serializer = PageVersionSerializer(data=request.data)
	if not serializer.is_valid():
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	page = serializer.validated_data.get("page")
	if str(page.book_id) != str(book_id):
		return Response(
			{"detail": "page does not belong to provided book_id."},
			status=status.HTTP_400_BAD_REQUEST,
		)
	access_error = _require_book_access(request, page.book)
	if access_error:
		return access_error
	draft_error = _require_book_in_draft(page.book)
	if draft_error:
		return draft_error

	if request.user and request.user.is_authenticated:
		tier = get_tier_for_book(request.user, page.book)
		has_existing_versions = PageVersion.objects.filter(page=page).exists()
		if has_existing_versions:
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
