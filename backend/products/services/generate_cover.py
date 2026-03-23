import uuid
from decimal import Decimal
from io import BytesIO
from PIL import Image

from django.core.exceptions import PermissionDenied
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from billing.models import LedgerEntry

from ..models import Book, Character, CoverVersion
from .call_nano_banana import call_nano_banana


def _build_thumbnail(image_file, *, max_size=(512, 512), name_prefix="cover_thumb"):
	if not image_file:
		return None

	image_file.seek(0)
	raw_bytes = image_file.read()
	image_file.seek(0)

	if not raw_bytes:
		return None

	with Image.open(BytesIO(raw_bytes)) as image:
		thumbnail = image.copy()
		thumbnail.thumbnail(max_size)
		thumb_bytes = BytesIO()
		thumbnail.save(thumb_bytes, format="PNG")

	thumbnail_file = ContentFile(thumb_bytes.getvalue())
	thumbnail_file.name = f"{name_prefix}.png"
	return thumbnail_file


def _load_reference_image(image_field):
	if not image_field:
		return None

	try:
		image_field.open("rb")
		with Image.open(image_field) as image:
			return image.convert("RGB").copy()
	except Exception:
		return None
	finally:
		try:
			image_field.close()
		except Exception:
			pass


def _collect_character_references(book, requested_character_ids=None, *, max_characters=4, max_photos_per_character=2):
	queryset = Character.objects.filter(book=book).prefetch_related("reference_photos").order_by("created_at")
	characters = list(queryset)

	if requested_character_ids:
		id_set = {str(character_id) for character_id in requested_character_ids}
		characters = [character for character in characters if str(character.id) in id_set]

	characters = characters[:max_characters]

	character_payload = []
	reference_images = []
	for character in characters:
		reference_fields = [photo.image for photo in character.reference_photos.all() if photo.image]
		if not reference_fields and character.reference_photo:
			reference_fields = [character.reference_photo]

		for field in reference_fields[:max_photos_per_character]:
			reference_image = _load_reference_image(field)
			if reference_image is not None:
				reference_images.append(reference_image)

		character_payload.append(
			{
				"id": str(character.id),
				"name": character.name,
				"role": "main character",
			}
		)

	return character_payload, reference_images


def _build_cover_prompt_snapshot(
	prompt_snapshot,
	*,
	title_text,
	subtitle_text,
	author_name,
	aspect_ratio,
	character_payload,
):
	provider_prompt_snapshot = dict(prompt_snapshot or {})
	provider_prompt_snapshot["title"] = title_text
	provider_prompt_snapshot["subtitle"] = subtitle_text
	provider_prompt_snapshot["author"] = author_name
	provider_prompt_snapshot["aspect_ratio"] = aspect_ratio or "2:3"
	provider_prompt_snapshot["characters"] = character_payload
	return provider_prompt_snapshot


def generate_cover(
	user,
	book,
	order,
	prompt_snapshot,
	*,
	title_text,
	subtitle_text=None,
	author_name=None,
	title_position=None,
	aspect_ratio="2:3",
	seed=None,
):
	if not isinstance(prompt_snapshot, dict):
		prompt_snapshot = {"raw_prompt": str(prompt_snapshot or "")}

	if seed in (None, ""):
		seed = uuid.uuid4().int % 2147483647

	requested_character_ids = []
	for character in prompt_snapshot.get("characters", []):
		if isinstance(character, dict) and character.get("id"):
			requested_character_ids.append(character.get("id"))

	character_payload, reference_images = _collect_character_references(
		book,
		requested_character_ids,
	)
	provider_prompt_snapshot = _build_cover_prompt_snapshot(
		prompt_snapshot,
		title_text=title_text or book.title or "Untitled",
		subtitle_text=subtitle_text,
		author_name=author_name,
		aspect_ratio=aspect_ratio,
		character_payload=character_payload,
	)

	with transaction.atomic():
		book = Book.objects.select_for_update().select_related("user").get(id=book.id)

		if book.user != user:
			raise PermissionDenied()

		version_qs = CoverVersion.objects.select_for_update().filter(book=book)
		if version_qs.filter(status="GENERATING").exists():
			raise Exception("Cover is already generating")

		version_number = version_qs.count() + 1
		cover_version = CoverVersion.objects.create(
			created_by_user=user,
			book=book,
			version_number=version_number,
			title_text=title_text or book.title or "Untitled",
			subtitle_text=subtitle_text,
			author_name=author_name,
			title_position=title_position,
			prompt_snapshot=prompt_snapshot,
			aspect_ratio=aspect_ratio or "2:3",
			seed=seed,
			generation_job_id=uuid.uuid4(),
			status="GENERATING",
			nano_request_id="",
		)

	try:
		(
			returned_prompt_snapshot,
			response_id,
			image_file,
			generation_cost_usd,
		) = call_nano_banana(
			provider_prompt_snapshot,
			reference_images=reference_images,
		)
		generation_error = None
	except Exception as exc:
		generation_error = str(exc)

	with transaction.atomic():
		book = Book.objects.select_for_update().get(id=book.id)
		cover_version = CoverVersion.objects.select_for_update().get(id=cover_version.id)

		attempt_number = version_number

		if generation_error:
			cover_version.status = "FAILED"
			cover_version.error_message = generation_error
			cover_version.save()
			return cover_version

		cover_version.prompt_snapshot = returned_prompt_snapshot
		cover_version.nano_request_id = response_id
		cover_version.generated_image = image_file
		cover_version.thumbnail = _build_thumbnail(
			image_file,
			name_prefix=f"cover_{cover_version.id}_thumb",
		)
		cover_version.generation_cost_usd = generation_cost_usd
		cover_version.status = "SUCCESS"

		metadata = {}
		if order:
			metadata = {
				"order_id": order.order_id,
				"tier_name": order.tier_name,
				"amount_paid": str(order.total_amount),
			}
		ledger_entry = LedgerEntry.objects.create(
			user=user,
			purchase=None,
			book=book,
			entry_type="GENERATION",
			content_type="COVER",
			content_id=cover_version.id,
			attempt_number=attempt_number,
			nano_request_id=response_id,
			metadata=metadata,
		)

		cover_version.ledger_entry = ledger_entry
		book.current_cover_version = cover_version

		cover_version.save()
		book.total_images_generated = (book.total_images_generated or 0) + 1
		book.total_generation_cost_usd = (
			book.total_generation_cost_usd or Decimal("0")
		) + (cover_version.generation_cost_usd or Decimal("0"))
		book.last_generation_at = timezone.now()
		book.save(
			update_fields=[
				"current_cover_version",
				"total_images_generated",
				"total_generation_cost_usd",
				"last_generation_at",
			]
		)

		return cover_version


def generate_cover_anonymous(
	anon_token,
	book,
	prompt_snapshot,
	*,
	title_text,
	subtitle_text=None,
	author_name=None,
	title_position=None,
	aspect_ratio="2:3",
	seed=None,
):
	if not isinstance(prompt_snapshot, dict):
		prompt_snapshot = {"raw_prompt": str(prompt_snapshot or "")}

	if seed in (None, ""):
		seed = uuid.uuid4().int % 2147483647

	requested_character_ids = []
	for character in prompt_snapshot.get("characters", []):
		if isinstance(character, dict) and character.get("id"):
			requested_character_ids.append(character.get("id"))

	character_payload, reference_images = _collect_character_references(
		book,
		requested_character_ids,
	)
	provider_prompt_snapshot = _build_cover_prompt_snapshot(
		prompt_snapshot,
		title_text=title_text or book.title or "Untitled",
		subtitle_text=subtitle_text,
		author_name=author_name,
		aspect_ratio=aspect_ratio,
		character_payload=character_payload,
	)

	with transaction.atomic():
		book = Book.objects.select_for_update().get(id=book.id)
		if str(book.session_key or "") != str(anon_token):
			raise PermissionDenied()

		version_qs = CoverVersion.objects.select_for_update().filter(book=book)
		if version_qs.filter(status="GENERATING").exists():
			raise Exception("Cover is already generating")

		version_number = version_qs.count() + 1
		cover_version = CoverVersion.objects.create(
			created_by_anon_token=anon_token,
			book=book,
			version_number=version_number,
			title_text=title_text or book.title or "Untitled",
			subtitle_text=subtitle_text,
			author_name=author_name,
			title_position=title_position,
			prompt_snapshot=prompt_snapshot,
			aspect_ratio=aspect_ratio or "2:3",
			seed=seed,
			generation_job_id=uuid.uuid4(),
			status="GENERATING",
			nano_request_id="",
		)

	try:
		(
			returned_prompt_snapshot,
			response_id,
			image_file,
			generation_cost_usd,
		) = call_nano_banana(
			provider_prompt_snapshot,
			reference_images=reference_images,
		)
		generation_error = None
	except Exception as exc:
		generation_error = str(exc)

	with transaction.atomic():
		book = Book.objects.select_for_update().get(id=book.id)
		cover_version = CoverVersion.objects.select_for_update().get(id=cover_version.id)

		if generation_error:
			cover_version.status = "FAILED"
			cover_version.error_message = generation_error
			cover_version.save()
			return cover_version

		cover_version.prompt_snapshot = returned_prompt_snapshot
		cover_version.nano_request_id = response_id
		cover_version.generated_image = image_file
		cover_version.thumbnail = _build_thumbnail(
			image_file,
			name_prefix=f"cover_{cover_version.id}_thumb",
		)
		cover_version.generation_cost_usd = generation_cost_usd
		cover_version.status = "SUCCESS"

		book.current_cover_version = cover_version

		cover_version.save()
		book.total_images_generated = (book.total_images_generated or 0) + 1
		book.total_generation_cost_usd = (
			book.total_generation_cost_usd or Decimal("0")
		) + (cover_version.generation_cost_usd or Decimal("0"))
		book.last_generation_at = timezone.now()
		book.save(
			update_fields=[
				"current_cover_version",
				"total_images_generated",
				"total_generation_cost_usd",
				"last_generation_at",
			]
		)

		return cover_version