from django.db import models
import uuid
from django.conf import settings

class PricingTier(models.Model):

    name = models.CharField(max_length=50)

    code = models.CharField(
        max_length=20,
        unique=True
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    currency = models.CharField(max_length=10, default="GEL")

    max_retries_per_unit = models.PositiveIntegerField()

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    

class Purchase(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="purchases"
    )

    tier = models.ForeignKey(
        "PricingTier",
        on_delete=models.PROTECT
    )

    book = models.OneToOneField(
        "books.Book",
        on_delete=models.CASCADE,
        related_name="purchase"
    )

    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    currency = models.CharField(max_length=10, default="GEL")

    status = models.CharField(
        max_length=20,
        choices=[
            ("PENDING", "Pending"),
            ("SUCCEEDED", "Succeeded"),
            ("FAILED", "Failed"),
        ],
        default="PENDING"
    )

    provider = models.CharField(max_length=20)  # e.g. bog, tbc

    provider_payment_id = models.CharField(max_length=255)

    created_at = models.DateTimeField(auto_now_add=True)




class LedgerEntry(models.Model):

    ENTRY_TYPES = [
        ("GENERATION", "Generation"),
        ("REFUND", "Refund"),
        ("PURCHASE", "Purchase"),
    ]

    CONTENT_TYPES = [
        ("PAGE", "Page"),
        ("COVER", "Cover"),
        ("CHARACTER", "Character"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ledger_entries"
    )

    purchase = models.ForeignKey(
        "billing.Purchase",
        on_delete=models.CASCADE,
        related_name="ledger_entries"
    )

    book = models.ForeignKey(
        "books.Book",
        on_delete=models.CASCADE,
        related_name="ledger_entries"
    )

    entry_type = models.CharField(
        max_length=20,
        choices=ENTRY_TYPES
    )

    content_type = models.CharField(
        max_length=20,
        choices=CONTENT_TYPES,
        null=True,
        blank=True
    )

    content_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="PageVersion, CoverVersion, or CharacterVersion ID"
    )

    attempt_number = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    retry_consumed = models.BooleanField(default=False)

    nano_request_id = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    metadata = models.JSONField(default=dict, blank=True)
    # example: 
    # metadata = {
    #     "tier_name": order.tier_name,
    #     "price": str(order.total_amount),
    # }

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["book"]),
            models.Index(fields=["content_id"]),
        ]