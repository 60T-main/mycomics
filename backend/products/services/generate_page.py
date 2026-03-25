import json
import uuid
from decimal import Decimal
from io import BytesIO

from PIL import Image

from django.db import transaction
from django.core.exceptions import PermissionDenied
from django.core.files.base import ContentFile
from django.utils import timezone

from ..models import Character
from ..models import Page, PageVersion
from billing.models import LedgerEntry
from .call_nano_banana import call_nano_banana


def _build_thumbnail(image_file, *, max_size=(512, 512), name_prefix="page_thumb"):
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


def _collect_character_references(
    book,
    requested_character_ids=None,
    *,
    max_characters=4,
    max_photos_per_character=2,
):
    queryset = (
        Character.objects.filter(book=book)
        .prefetch_related("reference_photos")
        .order_by("created_at")
    )
    characters = list(queryset)

    if requested_character_ids:
        id_set = {str(character_id) for character_id in requested_character_ids}
        characters = [character for character in characters if str(character.id) in id_set]

    characters = characters[:max_characters]

    character_payload = []
    reference_images = []

    for character in characters:
        reference_fields = [
            photo.image for photo in character.reference_photos.all() if photo.image
        ]
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


def generate_page(
    user,
    book,
    order,
    page_number: int,
    prompt: dict,
    *,
    requested_character_ids=None,
):
    prompt_text = json.dumps(prompt) if isinstance(prompt, dict) else str(prompt or "")
    character_payload, reference_images = _collect_character_references(
        book,
        requested_character_ids,
    )
    provider_prompt_snapshot = {
        "raw_prompt": prompt_text,
        "genre_mood": "storybook cinematic",
        "panel_structure": "single full-page panel",
        "location_description": f"Children's storybook page {page_number}",
        "characters": character_payload,
    }
    seed = uuid.uuid4().int % 2147483647

    # Phase 1: create/lock page and create a GENERATING version
    with transaction.atomic():
        page, created = (
            Page.objects
            .select_for_update()
            .select_related("book")
            .get_or_create(
                book=book,
                page_number=page_number,
                defaults={
                    "scene_description": prompt_text,
                    "text_content": prompt_text,
                },
            )
        )

        if not created and (
            page.scene_description != prompt_text or page.text_content != prompt_text
        ):
            page.scene_description = prompt_text
            page.text_content = prompt_text
            page.save(update_fields=["scene_description", "text_content"])

        if page.book.user != user:
            raise PermissionDenied()

        if page.is_locked:
            raise Exception("Page is locked")

        version_qs = PageVersion.objects.select_for_update().filter(page=page)
        if version_qs.filter(status="GENERATING").exists():
            raise Exception("Page is already generating")

        version_number = version_qs.count() + 1
        page_version = PageVersion.objects.create(
            page=page,
            version_number=version_number,
            prompt=prompt_text,
            seed=seed,
            status="GENERATING",
        )

    # Phase 2: external call (no DB transaction during external API call)
    try:
        (
            prompt_snapshot,
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

    # Phase 3: persist success or failure
    with transaction.atomic():
        page = Page.objects.select_for_update().get(id=page.id)
        page_version = PageVersion.objects.select_for_update().get(id=page_version.id)

        attempt_number = version_number

        if generation_error:
            page_version.prompt = prompt_text
            page_version.status = "FAILED"
            page_version.error_message = generation_error
            page_version.save()
            page.save()
            return page_version

        page_version.prompt = (
            json.dumps(prompt_snapshot)
            if isinstance(prompt_snapshot, dict)
            else str(prompt_snapshot)
        )
        page_version.nano_request_id = response_id
        page_version.image = image_file
        page_version.thumbnail = _build_thumbnail(
            image_file,
            name_prefix=f"page_{page_version.id}_thumb",
        )
        page_version.generation_cost_usd = generation_cost_usd
        page_version.status = "COMPLETED"

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
            book=page.book,
            entry_type="GENERATION",
            content_type="PAGE",
            content_id=page_version.id,
            attempt_number=attempt_number,
            nano_request_id=response_id,
            metadata=metadata,
        )

        page_version.ledger_entry = ledger_entry
        page.current_version = page_version

        page_version.save()
        page.save()

        book.total_images_generated = (book.total_images_generated or 0) + 1
        book.total_generation_cost_usd = (
            book.total_generation_cost_usd or Decimal("0")
        ) + (page_version.generation_cost_usd or Decimal("0"))
        book.last_generation_at = timezone.now()
        book.save()

        return page_version