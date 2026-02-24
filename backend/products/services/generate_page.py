import json
from decimal import Decimal

from django.db import transaction
from django.core.exceptions import PermissionDenied
from django.utils import timezone

from models import Page, PageVersion
from billing.models import LedgerEntry
from .call_nano_banana import call_nano_banana

def generate_page(user, book, order, page_number:int, prompt:dict):
    prompt_text = json.dumps(prompt) if isinstance(prompt, dict) else str(prompt)

    # Phase 1: create/lock page and create a GENERATING version
    with transaction.atomic():
        page, created = (
            Page.objects
            .select_for_update()
            .select_related("book")
            .get_or_create(
                book=book,
                page_number=page_number,
                scene_description=prompt_text,
                text_content=prompt_text,
            )
        )

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
            status="GENERATING",
        )

    # Phase 2: external call (no DB transaction during external API call)
    try:
        (
            prompt_snapshot,
            response_id,
            image_file,
            generation_cost_usd,
        ) = call_nano_banana(prompt)
        generation_error = None
    except Exception as exc:
        generation_error = str(exc)

    # Phase 3: persist success or failure
    with transaction.atomic():
        page = Page.objects.select_for_update().get(id=page.id)
        page_version = PageVersion.objects.select_for_update().get(id=page_version.id)

        attempt_number = version_number
        retry_consumed = attempt_number > 3
        if retry_consumed:
            page.is_locked = True

        if generation_error:
            page_version.status = "FAILED"
            page_version.error_message = generation_error
            page_version.save()
            page.save()
            return page_version

        page_version.prompt = prompt_snapshot
        page_version.nano_request_id = response_id
        page_version.image = image_file
        page_version.generation_cost_usd = generation_cost_usd
        page_version.status = "COMPLETED"

        ledger_entry = LedgerEntry.objects.create(
            user=user,
            purchase=order,
            book=page.book,
            entry_type="GENERATION",
            content_type="PAGE",
            content_id=page_version.id,
            attempt_number=attempt_number,
            retry_consumed=retry_consumed,
            nano_request_id=response_id,
            metadata={
                "tier_name": order.tier.name,
                "price": str(order.amount_paid),
            },
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