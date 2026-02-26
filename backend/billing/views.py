from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import LedgerEntry, PricingTier


@api_view(["GET"])
@permission_classes([AllowAny])
def pricing_tiers(request):
	queryset = PricingTier.objects.filter(is_active=True).order_by("price")
	return Response(
		[
			{
				"id": str(tier.id),
				"name": tier.name,
				"code": tier.code,
				"price": str(tier.price),
				"currency": tier.currency,
				"max_retries_per_unit": tier.max_retries_per_unit,
			}
			for tier in queryset
		]
	)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ledger_entries(request):
	entries = LedgerEntry.objects.filter(user=request.user).order_by("-created_at")
	return Response(
		[
			{
				"id": str(entry.id),
				"entry_type": entry.entry_type,
				"content_type": entry.content_type,
				"content_id": str(entry.content_id) if entry.content_id else None,
				"attempt_number": entry.attempt_number,
				"retry_consumed": entry.retry_consumed,
				"metadata": entry.metadata,
				"created_at": entry.created_at,
			}
			for entry in entries
		]
	)
