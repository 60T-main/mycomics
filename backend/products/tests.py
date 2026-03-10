from django.urls import reverse
import uuid

from rest_framework import status
from rest_framework.test import APITestCase

from customers.models import Customer

from .models import AnonymousProfile, Book, Character, Page
from .permissions import _hash_value, set_anon_cookie


class ProductWriteGuardsTests(APITestCase):
	def setUp(self):
		self.user = Customer.objects.create_user(
			username="owner",
			email="owner@example.com",
			password="testpass123",
		)
		self.other_user = Customer.objects.create_user(
			username="other",
			email="other@example.com",
			password="testpass123",
		)
		self.book = Book.objects.create(
			user=self.user,
			title="My Book",
			slug="my-book",
			art_style="watercolor",
			status="DRAFT",
		)

	def test_book_style_is_immutable_after_creation(self):
		self.client.force_authenticate(user=self.user)
		url = reverse("book-detail", kwargs={"item_id": self.book.id})
		response = self.client.patch(url, {"art_style": "anime"}, format="json")

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn("art_style", response.data)

	def test_book_update_requires_draft_status(self):
		self.client.force_authenticate(user=self.user)
		self.book.status = "ORDERED"
		self.book.save(update_fields=["status"])

		url = reverse("book-detail", kwargs={"item_id": self.book.id})
		response = self.client.patch(url, {"title": "New title"}, format="json")

		self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

	def test_cover_generation_requires_book_id(self):
		self.client.force_authenticate(user=self.user)
		url = reverse("cover-list-create")
		response = self.client.post(
			url,
			{"prompt_snapshot": {"idea": "cover"}},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data["detail"], "book_id is required.")

	def test_character_generation_requires_book_id(self):
		self.client.force_authenticate(user=self.user)
		character = Character.objects.create(
			book=self.book,
			user=self.user,
			name="Hero",
			reference_photo="characters/reference/hero.jpg",
		)
		url = reverse("character-version-list-create")
		response = self.client.post(
			url,
			{"character": str(character.id), "prompt_snapshot": {"idea": "hero"}},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data["detail"], "book_id is required.")

	def test_page_generation_requires_book_id(self):
		self.client.force_authenticate(user=self.user)
		page = Page.objects.create(book=self.book, page_number=1)
		url = reverse("page-version-list-create")
		response = self.client.post(
			url,
			{"page": str(page.id), "prompt": "scene"},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data["detail"], "book_id is required.")

	def test_character_detail_write_is_owner_only(self):
		character = Character.objects.create(
			book=self.book,
			user=self.user,
			name="Hero",
			reference_photo="characters/reference/hero.jpg",
		)
		self.client.force_authenticate(user=self.other_user)

		url = reverse("character-detail", kwargs={"item_id": character.id})
		response = self.client.patch(url, {"name": "Intruder"}, format="json")

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ProductInitCreateTests(APITestCase):
	def setUp(self):
		self.user = Customer.objects.create_user(
			username="creator",
			email="creator@example.com",
			password="testpass123",
		)

	def test_init_create_get_returns_needs_style_when_no_draft(self):
		self.client.force_authenticate(user=self.user)
		url = reverse("book-init-create")
		response = self.client.get(url)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["action"], "needs_style")

	def test_init_create_get_returns_resume_when_draft_exists(self):
		book = Book.objects.create(
			user=self.user,
			title="Draft",
			slug="draft",
			art_style="watercolor",
			status="DRAFT",
		)
		self.client.force_authenticate(user=self.user)
		url = reverse("book-init-create")
		response = self.client.get(url)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["action"], "resume")
		self.assertEqual(response.data["book"]["id"], str(book.id))

	def test_init_create_recovers_anon_profile_by_fingerprint(self):
		anon_token = uuid.uuid4()
		ip = "127.0.0.1"
		user_agent = "pytest-anon-agent"

		AnonymousProfile.objects.create(
			token=anon_token,
			ip_hash=_hash_value(ip),
			ua_hash=_hash_value(user_agent),
			book_creations=1,
		)
		book = Book.objects.create(
			title="Anon Draft",
			slug="anon-draft",
			art_style="anime",
			status="DRAFT",
			session_key=str(anon_token),
		)

		url = reverse("book-init-create")
		response = self.client.get(url, REMOTE_ADDR=ip, HTTP_USER_AGENT=user_agent)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["action"], "resume")
		self.assertEqual(response.data["book"]["id"], str(book.id))
		self.assertIn("anon_token", response.cookies)

	def test_set_anon_cookie_is_persistent(self):
		from django.http import HttpResponse

		token = uuid.uuid4()
		response = HttpResponse("ok")
		set_anon_cookie(response, token)

		self.assertIn("anon_token", response.cookies)
		self.assertEqual(
			response.cookies["anon_token"]["max-age"],
			60 * 60 * 24 * 365,
		)

	def test_init_create_accepts_token_after_ip_change(self):
		anon_token = uuid.uuid4()
		original_ip = "10.0.0.1"
		new_ip = "10.0.0.2"
		user_agent = "pytest-anon-agent"

		profile = AnonymousProfile.objects.create(
			token=anon_token,
			ip_hash=_hash_value(original_ip),
			ua_hash=_hash_value(user_agent),
			book_creations=1,
		)
		book = Book.objects.create(
			title="Anon Draft",
			slug="anon-draft-ip-change",
			art_style="anime",
			status="DRAFT",
			session_key=str(anon_token),
		)
		self.client.cookies["anon_token"] = str(anon_token)

		url = reverse("book-init-create")
		response = self.client.get(
			url,
			REMOTE_ADDR=new_ip,
			HTTP_USER_AGENT=user_agent,
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["action"], "resume")
		self.assertEqual(response.data["book"]["id"], str(book.id))
		profile.refresh_from_db()
		self.assertEqual(profile.ip_hash, _hash_value(new_ip))
