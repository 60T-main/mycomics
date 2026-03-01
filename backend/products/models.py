from django.db import models
from django.utils import timezone
from customers.models import Customer

import uuid

# Create your models here.

class Character(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="characters",
        null=True,
        blank=True,
    )
    created_by_anon_token = models.UUIDField(null=True, blank=True)

    book = models.ForeignKey("Book", on_delete=models.CASCADE, related_name="characters")
    name = models.CharField(max_length=100)

    reference_photo = models.ImageField(upload_to="characters/reference/")

    current_version = models.ForeignKey(
    "CharacterVersion",
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name="+"
)

    total_generation_attempts = models.IntegerField(default=0)
    free_retry_used = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    


class CharacterVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    character = models.ForeignKey(Character, related_name="versions", on_delete=models.CASCADE)
    version_number = models.PositiveIntegerField(null=True, blank=True)

    # Generated Output
    generated_image = models.ImageField(upload_to="characters/")
    thumbnail = models.ImageField(null=True, blank=True)

    # Prompt Snapshot (JSON)
    prompt_snapshot = models.JSONField()

    # Generation Parameters
    aspect_ratio = models.CharField(max_length=20)
    seed = models.BigIntegerField(null=True, blank=True)

    # Cost & Billing Reference
    generation_job_id = models.UUIDField()
    generation_cost_usd = models.DecimalField(max_digits=6, decimal_places=4, null=True)
    ledger_entry = models.ForeignKey(
    "billing.LedgerEntry",
    null=True,
    blank=True,
    on_delete=models.SET_NULL
)

    # Generation Status
    status = models.CharField(
    max_length=20,
    choices=[
        ("PENDING", "Pending"),
        ("GENERATING", "Generating"),
        ("SUCCESS", "Success"),
        ("FAILED", "Failed"),
    ],
    default="PENDING"
)
    error_message = models.TextField(null=True, blank=True)
    generation_time_ms = models.IntegerField(null=True, blank=True)


    created_at = models.DateTimeField(auto_now_add=True)

    nano_request_id = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("character", "version_number")
        ordering = ["-version_number"]
        indexes = [
        models.Index(fields=["character", "created_at"]),
    ]



class Book(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Ownership
    user = models.ForeignKey(
        Customer,
        related_name="books",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    session_key = models.CharField(
        max_length=40, blank=True, null=True,
        help_text="For anonymous book before login"
    )

    # Title
    title = models.CharField(max_length=255)
    slug = models.SlugField(null=True, blank=True)

    # Style
    art_style = models.CharField(max_length=100)
    style_version = models.CharField(max_length=50, null=True, blank=True)

    # Book Status
    status = models.CharField(
    max_length=30,
    choices=[
        ("DRAFT", "Draft"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETE", "Complete"),
        ("LOCKED", "Locked"),
        ("ORDERED", "Ordered"),
        ("PRINTED", "Printed"),
        ("ARCHIVED", "Archived"),
    ],
    default="DRAFT"
)

    # Number Of Pages
    total_pages = models.IntegerField(default=0)
    last_generation_at = models.DateTimeField(null=True, blank=True)

    # Cover 
    current_cover_version = models.ForeignKey(
    "CoverVersion",
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name="+"
)

    print_size = models.CharField(max_length=50, null=True, blank=True)
    paper_type = models.CharField(max_length=50, null=True, blank=True)
    binding_type = models.CharField(max_length=50, null=True, blank=True)
    is_print_ready = models.BooleanField(default=False)
    print_locked_at = models.DateTimeField(null=True, blank=True)

    is_consistency_verified = models.BooleanField(default=False)

    # COST TRACKING
    total_images_generated = models.PositiveIntegerField(default=0)
    total_generation_cost_usd = models.DecimalField(
    max_digits=8,
    decimal_places=4,
    default=0
)

    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "slug")
        indexes = [
        models.Index(fields=["user", "status"]),
        models.Index(fields=["user", "-created_at"]),
    ]

class CoverVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    created_by_user = models.ForeignKey(
        Customer,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="cover_versions",
    )
    created_by_anon_token = models.UUIDField(null=True, blank=True)

    book = models.ForeignKey(
    Book,
    related_name="cover_versions",
    on_delete=models.CASCADE
)
    version_number = models.PositiveIntegerField(null=True, blank=True)

    # Title
    title_text = models.CharField(max_length=255)
    subtitle_text = models.CharField(max_length=255, null=True, blank=True)
    author_name = models.CharField(max_length=255, null=True, blank=True)
    title_position = models.JSONField(null=True, blank=True)

    # Generated Output
    generated_image = models.ImageField(upload_to="covers/")
    full_spread_image = models.ImageField(null=True, blank=True, upload_to="covers/")
    thumbnail = models.ImageField(null=True, blank=True)

    # Prompt Snapshot (JSON)
    prompt_snapshot = models.JSONField()

    # Generation Parameters
    aspect_ratio = models.CharField(max_length=20)
    seed = models.BigIntegerField(null=True, blank=True)

    # Cost & Billing Reference
    generation_job_id = models.UUIDField()
    generation_cost_usd = models.DecimalField(max_digits=6, decimal_places=4, null=True)
    ledger_entry = models.ForeignKey(
    "billing.LedgerEntry",
    null=True,
    blank=True,
    on_delete=models.SET_NULL
)

    # Generation Status
    status = models.CharField(
    max_length=20,
    choices=[
        ("PENDING", "Pending"),
        ("GENERATING", "Generating"),
        ("SUCCESS", "Success"),
        ("FAILED", "Failed"),
    ],
    default="PENDING"
)
    
    nano_request_id = models.CharField(max_length=255, blank=True)

    error_message = models.TextField(null=True, blank=True)
    generation_time_ms = models.IntegerField(null=True, blank=True)


    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("book", "version_number")



class Page(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="pages")

    current_version = models.ForeignKey(
    "PageVersion",
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name="+"
)

    page_number = models.PositiveSmallIntegerField()

    # Narrative structure
    scene_description = models.TextField(blank=True)
    text_content = models.TextField(blank=True)

    # State
    is_locked = models.BooleanField(default=False)

    class Meta:
        unique_together = ("book", "page_number")
        ordering = ["page_number"]


class PageVersion(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="versions")

    version_number = models.PositiveIntegerField(null=True, blank=True)

    # Generation input snapshot
    prompt = models.TextField(null=True, blank=True)

    # API tracking
    nano_request_id = models.CharField(max_length=255,null=True, blank=True)
    ledger_entry = models.ForeignKey(
    "billing.LedgerEntry",
    null=True,
    blank=True,
    on_delete=models.SET_NULL
)
    generation_cost_usd = models.DecimalField(
    max_digits=6,
    decimal_places=4,
    null=True,
    blank=True
)

    # Output
    image = models.ImageField(null=True, blank=True, upload_to="pages/")

    status = models.CharField(
        max_length=20,
        choices=[
            ("PENDING", "Pending"),
            ("GENERATING", "Generating"),
            ("COMPLETED", "Completed"),
            ("FAILED", "Failed"),
        ],
        default="PENDING"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("page", "version_number")
        ordering = ["-version_number"]
        indexes = [
        models.Index(fields=["page", "created_at"]),
    ]


class AnonymousProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.UUIDField(unique=True, editable=False)
    ip_hash = models.CharField(max_length=64)
    ua_hash = models.CharField(max_length=64)
    book_creations = models.PositiveIntegerField(default=0)
    character_creations = models.PositiveIntegerField(default=0)
    character_generations = models.PositiveIntegerField(default=0)
    cover_generations = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(default=timezone.now)


class RetryAllowance(models.Model):
    CONTENT_TYPES = [
        ("CHARACTER", "Character"),
        ("COVER", "Cover"),
        ("PAGE", "Page"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="retry_allowances",
    )
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    content_id = models.UUIDField()
    max_retries = models.PositiveIntegerField(default=0)
    used_retries = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "content_type", "content_id")
        indexes = [
            models.Index(fields=["user", "content_type", "content_id"]),
        ]