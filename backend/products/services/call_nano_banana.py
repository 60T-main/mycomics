from google import genai
from PIL import Image
from google.genai import types


from decimal import Decimal
from io import BytesIO

from django.core.files.base import ContentFile
from django.conf import settings


def call_nano_banana(
    prompt=None,
    reference_images=None,
    *,
    genre_mood="dramatic",
    panel_structure="full_bleed_cinematic",
    location_description=None,
    environment_details=None,
    narration_text=None,
    dialogue_line=None,
    characters=None,
):
    raw_prompt_text = None
    aspect_ratio = "2:3"
    prompt_payload = prompt if isinstance(prompt, dict) else {"raw_prompt": str(prompt or "")}

    if prompt is not None and not isinstance(prompt, dict):
        raw_prompt_text = str(prompt)

    if isinstance(prompt, dict):
        genre_mood = prompt.get("genre_mood", genre_mood)
        panel_structure = prompt.get("panel_structure", panel_structure)
        location_description = prompt.get(
            "location_description", location_description
        )
        environment_details = prompt.get("environment_details", environment_details)
        narration_text = prompt.get("narration_text", narration_text)
        dialogue_line = prompt.get("dialogue_line", dialogue_line)
        characters = prompt.get("characters", characters)
        aspect_ratio = prompt.get("aspect_ratio", aspect_ratio) or "2:3"
        raw_prompt_text = prompt.get("raw_prompt", raw_prompt_text)

    prompt_parts = []
    provided_reference_images = reference_images or []
    normalized_reference_images = []
    for image in provided_reference_images:
        if image is None:
            continue
        normalized_reference_images.append(image)

    is_cover_prompt = isinstance(prompt, dict) and any(
        key in prompt for key in ["title", "template", "subtitle", "author"]
    )

    if raw_prompt_text:
        prompt_parts.append(raw_prompt_text)

    if is_cover_prompt:
        cover_title = (prompt.get("title") or "Untitled").strip()
        cover_subtitle = (prompt.get("subtitle") or "").strip()
        cover_author = (prompt.get("author") or "").strip()
        cover_template = (prompt.get("template") or "dramatic").strip()
        prompt_parts.append(
            "Create a high-quality illustrated children's storybook cover."
        )
        prompt_parts.append(f"Style direction: {cover_template}.")
        prompt_parts.append(f"Main title on cover: {cover_title}.")
        if cover_subtitle:
            prompt_parts.append(f"Subtitle on cover: {cover_subtitle}.")
        if cover_author:
            prompt_parts.append(f"Author credit on cover: {cover_author}.")
        prompt_parts.append(
            "The layout should read as a finished front cover with clear focal point and print-safe composition."
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

            if normalized_reference_images:
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

    if normalized_reference_images:
        prompt_parts.insert(
            0,
            "Use the provided reference images as exact character identity anchors. "
            "Preserve the same face, hair, skin tone, and overall likeness with no changes.",
        )

    prompt_text = " ".join(part for part in prompt_parts if part).strip()
    if not prompt_text:
        raise ValueError("Prompt could not be built for generation.")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    contents = [prompt_text] + normalized_reference_images

    try:
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["Text", "Image"],
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
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
            raw_image_bytes = getattr(part.inline_data, "data", None)
            if raw_image_bytes:
                with Image.open(BytesIO(raw_image_bytes)) as image:
                    generated_image = image.copy()

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
    generated_image.save(image_bytes, "PNG")
    image_file = ContentFile(image_bytes.getvalue())
    response_id = str(getattr(response, "response_id", "")) or "nano-response"
    image_file.name = f"{response_id}.png"

    returned_prompt_snapshot = {
        "input": prompt_payload,
        "prompt_text": prompt_text,
        "provider_model": "gemini-3-pro-image-preview",
        "response_id": response_id,
        "aspect_ratio": aspect_ratio,
    }

    return returned_prompt_snapshot, response_id, image_file, generation_cost_usd