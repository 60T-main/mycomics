from google import genai
from PIL import Image
from google.genai import types


from decimal import Decimal
from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.conf import settings


def call_nano_banana(
    prompt=None,
    *,
    genre_mood="dramatic",
    panel_structure="full_bleed_cinematic",
    location_description=None,
    environment_details=None,
    narration_text=None,
    dialogue_line=None,
    characters=None,
):
    if prompt is not None:
        if not isinstance(prompt, dict):
            raise ValueError("prompt must be a dict when provided")

        genre_mood = prompt.get("genre_mood", genre_mood)
        panel_structure = prompt.get("panel_structure", panel_structure)
        location_description = prompt.get(
            "location_description", location_description
        )
        environment_details = prompt.get("environment_details", environment_details)
        narration_text = prompt.get("narration_text", narration_text)
        dialogue_line = prompt.get("dialogue_line", dialogue_line)
        characters = prompt.get("characters", characters)
    prompt_parts = []
    reference_images = []

    prompt_parts.append(
        "Use the provided reference image as the exact character identity. "
        "Preserve the same face, hair, skin tone, and overall likeness with no changes."
    )

    if genre_mood:
        prompt_parts.append(f"Genre mood: {genre_mood}.")
    if panel_structure:
        prompt_parts.append(f"Panel structure: {panel_structure}.")
    if location_description:
        prompt_parts.append(f"Location: {location_description}.")
    if environment_details:
        prompt_parts.append(f"Environment: {environment_details}.")

    if characters:
        prompt_parts.append("Characters:")
        for index, character in enumerate(characters, start=1):
            if not character:
                continue
            name = character.get("name")
            character_id = character.get("id")
            role = character.get("role")
            expression = character.get("expression")
            pose = character.get("pose")
            costume = character.get("costume")

            details = []
            if name:
                details.append(f"name {name}")
            if role:
                details.append(f"role {role}")
            if expression:
                details.append(f"expression {expression}")
            if pose:
                details.append(f"pose {pose}")
            if costume:
                details.append(f"outfit {costume}")

            if name and character_id:
                image_path = (
                    Path(settings.BASE_DIR)
                    / "products"
                    / "services"
                    / f"{name}_{character_id}.png"
                )
                if image_path.exists():
                    reference_images.append(Image.open(image_path))
                    details.append("reference image provided")

            if details:
                prompt_parts.append(
                    f"Character {index}: " + ", ".join(details) + "."
                )

    if narration_text:
        prompt_parts.append(
            f"Add a narration box with the exact text: \"{narration_text}\"."
        )
    if dialogue_line:
        prompt_parts.append(
            f"Add a speech bubble with the exact text: \"{dialogue_line}\"."
        )

    prompt = " ".join(prompt_parts)

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    image = Image.open(Path(settings.BASE_DIR) / "products" / "services" / "input.png")
    contents = [prompt, image] + reference_images

    try:
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["Text", "Image"],
                image_config=types.ImageConfig(
                    aspect_ratio="2:3",
                ),
            )
        )
    except Exception as exc:
        raise RuntimeError(f"Gemini generation failed: {exc}") from exc

    usage_metadata = response.usage_metadata
    generated_image = None
    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            generated_image = part.as_image()
            generated_image.save("generated_image.png")

    if generated_image is None:
        raise RuntimeError("Gemini response had no image content.")

    image_tokens = Decimal("0")
    if usage_metadata and usage_metadata.candidates_tokens_details:
        for detail in usage_metadata.candidates_tokens_details:
            if getattr(detail, "modality", None) == "IMAGE":
                image_tokens += Decimal(str(detail.token_count or 0))

    prompt_tokens = Decimal(str(getattr(usage_metadata, "prompt_token_count", 0) or 0))
    candidate_tokens = Decimal(
        str(getattr(usage_metadata, "candidates_token_count", 0) or 0)
    )
    output_text_tokens = max(candidate_tokens - image_tokens, Decimal("0"))

    input_cost = (prompt_tokens / Decimal("1000000")) * Decimal("2.00")
    output_text_cost = (output_text_tokens / Decimal("1000000")) * Decimal("12.00")
    output_image_cost = (image_tokens / Decimal("1000000")) * Decimal("120.00")
    generation_cost_usd = input_cost + output_text_cost + output_image_cost

    image_bytes = BytesIO()
    generated_image.save(image_bytes, format="PNG")
    image_file = ContentFile(image_bytes.getvalue())
    image_file.name = "generated_image.png"

    return prompt, response.response_id, image_file, generation_cost_usd