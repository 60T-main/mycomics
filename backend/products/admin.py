from django.contrib import admin

from .models import Book


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
