from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Address, Customer


@admin.register(Customer)
class CustomerAdmin(UserAdmin):
	list_display = (
		"username",
		"email",
		"first_name",
		"last_name",
		"is_staff",
		"is_active",
	)
	list_filter = ("is_staff", "is_active", "is_superuser", "groups")
	search_fields = ("username", "email", "first_name", "last_name", "phone")
	fieldsets = UserAdmin.fieldsets + (("Profile", {"fields": ("phone", "avatar")}),)
	add_fieldsets = UserAdmin.add_fieldsets + (("Profile", {"fields": ("email", "phone", "avatar")}),)


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
	list_display = (
		"full_name",
		"email",
		"phone",
		"city",
		"user",
		"session_key",
		"is_default",
		"created_at",
	)
	list_filter = ("city", "is_default", "created_at")
	search_fields = (
		"full_name",
		"email",
		"phone",
		"address_line1",
		"address_line2",
		"city",
		"user__username",
		"user__email",
		"session_key",
	)
