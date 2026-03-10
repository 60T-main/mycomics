import uuid
from decimal import Decimal

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone

from billing.models import LedgerEntry

from ..models import Book, CoverVersion
from .call_nano_banana import call_nano_banana


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
		) = call_nano_banana(prompt_snapshot)
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