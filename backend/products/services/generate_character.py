import uuid
from decimal import Decimal

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone

from billing.models import LedgerEntry

from ..models import CharacterVersion
from .call_nano_banana import call_nano_banana


def generate_character(user, character, order, prompt_snapshot, *, aspect_ratio="2:3", seed=None):
	if not isinstance(prompt_snapshot, dict):
		prompt_snapshot = {"raw_prompt": str(prompt_snapshot or "")}

	with transaction.atomic():
		character = (
			character.__class__.objects.select_for_update()
			.select_related("book", "book__user")
			.get(id=character.id)
		)

		if character.book.user != user:
			raise PermissionDenied()

		version_qs = CharacterVersion.objects.select_for_update().filter(character=character)
		if version_qs.filter(status="GENERATING").exists():
			raise Exception("Character is already generating")

		version_number = version_qs.count() + 1
		character_version = CharacterVersion.objects.create(
			character=character,
			version_number=version_number,
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
		) = call_nano_banana(prompt_snapshot)
		generation_error = None
	except Exception as exc:
		generation_error = str(exc)

	with transaction.atomic():
		character = character.__class__.objects.select_for_update().get(id=character.id)
		character_version = CharacterVersion.objects.select_for_update().get(id=character_version.id)

		attempt_number = version_number

		if generation_error:
			character_version.status = "FAILED"
			character_version.error_message = generation_error
			character_version.save()
			return character_version

		character_version.prompt_snapshot = returned_prompt_snapshot
		character_version.nano_request_id = response_id
		character_version.generated_image = image_file
		character_version.generation_cost_usd = generation_cost_usd
		character_version.status = "SUCCESS"

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
			book=character.book,
			entry_type="GENERATION",
			content_type="CHARACTER",
			content_id=character_version.id,
			attempt_number=attempt_number,
			nano_request_id=response_id,
			metadata=metadata,
		)

		character_version.ledger_entry = ledger_entry
		character.current_version = character_version

		character_version.save()
		character.save(update_fields=["current_version"])

		book = character.book
		book.total_images_generated = (book.total_images_generated or 0) + 1
		book.total_generation_cost_usd = (
			book.total_generation_cost_usd or Decimal("0")
		) + (character_version.generation_cost_usd or Decimal("0"))
		book.last_generation_at = timezone.now()
		book.save(update_fields=["total_images_generated", "total_generation_cost_usd", "last_generation_at"])

		return character_version