from django.contrib import admin
import uuid

from .models import AnonymousProfile, Book, Character


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
	list_display = (
		"title",
		"art_style",
		"status",
		"user",
		"is_archived",
		"created_at",
	)
	list_filter = ("status", "is_archived", "is_print_ready", "created_at")
	search_fields = ("title", "slug", "art_style", "user__username", "user__email")

	def _reset_anon_book_counter(self, session_key):
		if not session_key:
			return
		try:
			token = uuid.UUID(str(session_key))
		except (ValueError, TypeError):
			return
		AnonymousProfile.objects.filter(token=token).update(book_creations=0)

	def delete_model(self, request, obj):
		session_key = obj.session_key
		super().delete_model(request, obj)
		self._reset_anon_book_counter(session_key)

	def delete_queryset(self, request, queryset):
		session_keys = list(
			queryset.exclude(session_key__isnull=True)
			.exclude(session_key="")
			.values_list("session_key", flat=True)
		)
		super().delete_queryset(request, queryset)
		for session_key in session_keys:
			self._reset_anon_book_counter(session_key)


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
	list_display = (
		"name",
		"gender",
		"book",
		"user",
		"current_version",
		"created_at",
	)
	list_filter = ("gender", "created_at", "free_retry_used")
	search_fields = ("name", "book__title", "user__username", "user__email")


@admin.register(AnonymousProfile)
class AnonymousProfileAdmin(admin.ModelAdmin):
	list_display = (
		"token",
		"book_creations",
		"character_creations",
		"character_generations",
		"cover_generations",
		"created_at",
		"last_seen_at",
	)
	list_filter = ("created_at", "last_seen_at")
	search_fields = ("token", "ip_hash", "ua_hash")
