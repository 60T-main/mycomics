from django.urls import reverse
import uuid
import shutil
import tempfile
from decimal import Decimal
from io import BytesIO
from unittest.mock import patch

from PIL import Image

from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from billing.models import PricingTier
from customers.models import Customer
from orders.models import Order, OrderItem

from .models import (
	AnonymousProfile,
	Book,
	Character,
	CharacterReferencePhoto,
	CoverVersion,
	Page,
	PageVersion,
)
from .permissions import _hash_value, set_anon_cookie
from .services.call_nano_banana import call_nano_banana
from .services.generate_cover import generate_cover_anonymous


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


class CoverGenerationWiringTests(APITestCase):
	def setUp(self):
		self._temp_media_dir = tempfile.mkdtemp(prefix="mycomics-test-media-")
		self._override = override_settings(MEDIA_ROOT=self._temp_media_dir)
		self._override.enable()

		self.user = Customer.objects.create_user(
			username="cover-owner",
			email="cover-owner@example.com",
			password="testpass123",
		)
		self.other_user = Customer.objects.create_user(
			username="cover-other",
			email="cover-other@example.com",
			password="testpass123",
		)
		self.book = Book.objects.create(
			user=self.user,
			title="Cover Book",
			slug="cover-book",
			art_style="storybook",
			status="DRAFT",
		)

	def tearDown(self):
		self._override.disable()
		shutil.rmtree(self._temp_media_dir, ignore_errors=True)

	def _make_png_upload(self, name="reference.png"):
		buffer = BytesIO()
		Image.new("RGB", (64, 64), color=(255, 0, 0)).save(buffer, format="PNG")
		buffer.seek(0)
		return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

	def _mock_generation_result(self):
		buffer = BytesIO()
		Image.new("RGB", (256, 256), color=(10, 40, 90)).save(buffer, format="PNG")
		content = ContentFile(buffer.getvalue())
		content.name = "mock_generated_cover.png"
		return (
			{"provider_model": "mock", "prompt_text": "mocked"},
			"nano-mock-response-id",
			content,
			Decimal("0.1234"),
		)

	def test_cover_generation_sends_character_reference_images_and_persists_outputs(self):
		character = Character.objects.create(
			book=self.book,
			user=self.user,
			name="Luna",
			reference_photo=self._make_png_upload("luna-main.png"),
		)
		CharacterReferencePhoto.objects.create(
			character=character,
			image=self._make_png_upload("luna-alt.png"),
		)

		self.client.force_authenticate(user=self.user)
		url = reverse("cover-list-create")

		with patch(
			"products.services.generate_cover.call_nano_banana",
			return_value=self._mock_generation_result(),
		) as nano_mock:
			response = self.client.post(
				url,
				{
					"book_id": str(self.book.id),
					"title_text": "My Family Story",
					"prompt_snapshot": {
						"template": "heroic",
						"characters": [
							{"id": str(character.id), "name": character.name}
						],
					},
				},
				format="json",
			)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		nano_mock.assert_called_once()
		self.assertIn("reference_images", nano_mock.call_args.kwargs)
		self.assertGreaterEqual(len(nano_mock.call_args.kwargs["reference_images"]), 1)
		self.assertIsNone(response.data.get("generated_image"))
		self.assertIsNone(response.data.get("full_spread_image"))
		self.assertIsNotNone(response.data.get("thumbnail"))

		generated_cover = CoverVersion.objects.get(id=response.data["id"])
		self.assertEqual(generated_cover.status, "SUCCESS")
		self.assertEqual(generated_cover.nano_request_id, "nano-mock-response-id")
		self.assertIsNotNone(generated_cover.generation_job_id)
		self.assertIsNotNone(generated_cover.seed)
		self.assertIsNotNone(generated_cover.generated_image)
		self.assertIsNotNone(generated_cover.thumbnail)
		self.assertEqual(generated_cover.generation_cost_usd, Decimal("0.1234"))

		self.book.refresh_from_db()
		self.assertEqual(str(self.book.current_cover_version_id), str(generated_cover.id))
		self.assertEqual(self.book.total_images_generated, 1)

	def test_cover_generation_list_is_scoped_by_owner(self):
		CoverVersion.objects.create(
			created_by_user=self.user,
			book=self.book,
			version_number=1,
			title_text="Owner Cover",
			prompt_snapshot={"ok": True},
			generation_job_id=uuid.uuid4(),
			status="SUCCESS",
		)

		other_book = Book.objects.create(
			user=self.other_user,
			title="Other Book",
			slug="other-book",
			art_style="storybook",
			status="DRAFT",
		)
		CoverVersion.objects.create(
			created_by_user=self.other_user,
			book=other_book,
			version_number=1,
			title_text="Other Cover",
			prompt_snapshot={"ok": True},
			generation_job_id=uuid.uuid4(),
			status="SUCCESS",
		)

		self.client.force_authenticate(user=self.user)
		response = self.client.get(reverse("cover-list-create"))

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]["title_text"], "Owner Cover")

	def test_generate_cover_anonymous_sends_character_reference_images(self):
		anon_token = uuid.uuid4()
		book = Book.objects.create(
			title="Anon Cover Book",
			slug="anon-cover-book",
			art_style="storybook",
			status="DRAFT",
			session_key=str(anon_token),
		)
		character = Character.objects.create(
			book=book,
			name="Mio",
			reference_photo=self._make_png_upload("mio-main.png"),
		)

		with patch(
			"products.services.generate_cover.call_nano_banana",
			return_value=self._mock_generation_result(),
		) as nano_mock:
			cover = generate_cover_anonymous(
				anon_token,
				book,
				{"template": "dramatic", "characters": [{"id": str(character.id)}]},
				title_text="Anon Story",
				subtitle_text="Anon Subtitle",
				author_name="Anon Author",
			)

		self.assertEqual(cover.status, "SUCCESS")
		nano_mock.assert_called_once()
		self.assertIn("reference_images", nano_mock.call_args.kwargs)
		self.assertGreaterEqual(len(nano_mock.call_args.kwargs["reference_images"]), 1)


class PageGenerationSecurityTests(APITestCase):
	def setUp(self):
		self._temp_media_dir = tempfile.mkdtemp(prefix="mycomics-test-media-page-")
		self._override = override_settings(MEDIA_ROOT=self._temp_media_dir)
		self._override.enable()

		self.user = Customer.objects.create_user(
			username="page-owner",
			email="page-owner@example.com",
			password="testpass123",
		)
		self.other_user = Customer.objects.create_user(
			username="page-other",
			email="page-other@example.com",
			password="testpass123",
		)
		self.book = Book.objects.create(
			user=self.user,
			title="Page Book",
			slug="page-book",
			art_style="storybook",
			status="DRAFT",
		)
		self.tier = PricingTier.objects.create(
			name="Starter",
			code="starter",
			price=Decimal("9.99"),
			currency="GEL",
			max_retries_per_unit=3,
		)
		self.order = Order.objects.create(
			customer=self.user,
			tier_name=self.tier.code,
			status="paid",
			paid_at=timezone.now(),
		)
		OrderItem.objects.create(
			order=self.order,
			book=self.book,
			quantity=1,
			unit_price=Decimal("9.99"),
		)
		self.page = Page.objects.create(book=self.book, page_number=1)

	def tearDown(self):
		self._override.disable()
		shutil.rmtree(self._temp_media_dir, ignore_errors=True)

	def _mock_generation_result(self):
		buffer = BytesIO()
		Image.new("RGB", (256, 256), color=(30, 20, 120)).save(buffer, format="PNG")
		content = ContentFile(buffer.getvalue())
		content.name = "mock_generated_page.png"
		return (
			{"provider_model": "mock", "prompt_text": "mocked-page"},
			"nano-page-mock-response-id",
			content,
			Decimal("0.2222"),
		)

	def _make_png_upload(self, name="reference.png"):
		buffer = BytesIO()
		Image.new("RGB", (64, 64), color=(120, 40, 40)).save(buffer, format="PNG")
		buffer.seek(0)
		return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

	def test_page_generation_returns_thumbnail_and_hides_full_image(self):
		self.client.force_authenticate(user=self.user)
		url = reverse("page-version-list-create")

		with patch(
			"products.services.generate_page.call_nano_banana",
			return_value=self._mock_generation_result(),
		):
			response = self.client.post(
				url,
				{
					"book_id": str(self.book.id),
					"page": str(self.page.id),
					"prompt": "hero arrives",
				},
				format="json",
			)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertIsNone(response.data.get("image"))
		self.assertIsNotNone(response.data.get("thumbnail"))
		self.assertIsNotNone(response.data.get("generation_job_id"))
		self.assertIsNotNone(response.data.get("seed"))

		created = PageVersion.objects.get(id=response.data["id"])
		self.assertIsNotNone(created.image)
		self.assertIsNotNone(created.thumbnail)

	def test_page_version_list_is_scoped_by_owner(self):
		owner_version = PageVersion.objects.create(page=self.page, version_number=1, status="COMPLETED")
		other_book = Book.objects.create(
			user=self.other_user,
			title="Other Page Book",
			slug="other-page-book",
			art_style="storybook",
			status="DRAFT",
		)
		other_page = Page.objects.create(book=other_book, page_number=1)
		PageVersion.objects.create(page=other_page, version_number=1, status="COMPLETED")

		self.client.force_authenticate(user=self.user)
		response = self.client.get(reverse("page-version-list-create"))

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]["id"], str(owner_version.id))

	def test_page_generation_uses_only_selected_character_references(self):
		selected_character = Character.objects.create(
			book=self.book,
			user=self.user,
			name="Selected Hero",
			reference_photo=self._make_png_upload("selected-hero.png"),
		)
		unselected_character = Character.objects.create(
			book=self.book,
			user=self.user,
			name="Hidden Hero",
			reference_photo=self._make_png_upload("hidden-hero.png"),
		)

		self.client.force_authenticate(user=self.user)
		url = reverse("page-version-list-create")

		with patch(
			"products.services.generate_page.call_nano_banana",
			return_value=self._mock_generation_result(),
		) as nano_mock:
			response = self.client.post(
				url,
				{
					"book_id": str(self.book.id),
					"page": str(self.page.id),
					"prompt": "hero arrives",
					"requested_character_ids": [str(selected_character.id)],
				},
				format="json",
			)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		nano_mock.assert_called_once()
		self.assertIn("reference_images", nano_mock.call_args.kwargs)
		self.assertEqual(len(nano_mock.call_args.kwargs["reference_images"]), 1)

		provider_prompt = nano_mock.call_args.args[0]
		character_ids = [str(item.get("id")) for item in provider_prompt.get("characters", [])]
		self.assertIn(str(selected_character.id), character_ids)
		self.assertNotIn(str(unselected_character.id), character_ids)


class NanoBananaIntegrationUnitTests(SimpleTestCase):
	def _build_png_bytes(self):
		buffer = BytesIO()
		Image.new("RGB", (32, 32), color=(1, 2, 3)).save(buffer, format="PNG")
		return buffer.getvalue()

	@patch("products.services.call_nano_banana.genai.Client")
	def test_call_nano_banana_uses_inline_data_bytes_instead_of_as_image(self, client_cls_mock):
		png_bytes = self._build_png_bytes()

		class _InlineData:
			def __init__(self, data):
				self.data = data

		class _Part:
			text = None
			def __init__(self, data):
				self.inline_data = _InlineData(data)
			def as_image(self):
				raise AssertionError("as_image should not be called")

		class _UsageMetadata:
			prompt_token_count = 100
			candidates_token_count = 200
			candidates_tokens_details = []

		class _Response:
			def __init__(self):
				self.parts = [_Part(png_bytes)]
				self.usage_metadata = _UsageMetadata()
				self.response_id = "nano-inline-test"

		client_instance = client_cls_mock.return_value
		client_instance.models.generate_content.return_value = _Response()

		returned_prompt_snapshot, response_id, image_file, generation_cost_usd = call_nano_banana(
			{"title": "Test Cover", "template": "heroic", "characters": []}
		)

		self.assertEqual(response_id, "nano-inline-test")
		self.assertEqual(returned_prompt_snapshot["response_id"], "nano-inline-test")
		self.assertIsNotNone(image_file)
		self.assertTrue(image_file.name.endswith(".png"))
		self.assertIsNotNone(generation_cost_usd)
