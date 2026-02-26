from django.urls import path

from . import views

urlpatterns = [
	path("books/", views.book_list_create, name="book-list-create"),
	path("books/<uuid:item_id>/", views.book_detail, name="book-detail"),
	path("characters/", views.character_list_create, name="character-list-create"),
	path(
		"characters/<uuid:item_id>/",
		views.character_detail,
		name="character-detail",
	),
	path(
		"character-versions/",
		views.character_version_list_create,
		name="character-version-list-create",
	),
	path(
		"character-versions/<uuid:item_id>/",
		views.character_version_detail,
		name="character-version-detail",
	),
	path("cover-versions/", views.cover_version_list_create, name="cover-list-create"),
	path(
		"cover-versions/<uuid:item_id>/",
		views.cover_version_detail,
		name="cover-detail",
	),
	path("pages/", views.page_list_create, name="page-list-create"),
	path("pages/<uuid:item_id>/", views.page_detail, name="page-detail"),
	path(
		"page-versions/",
		views.page_version_list_create,
		name="page-version-list-create",
	),
	path(
		"page-versions/<uuid:item_id>/",
		views.page_version_detail,
		name="page-version-detail",
	),
	path("retries/add/", views.add_retry_pack, name="retry-pack-add"),
]
