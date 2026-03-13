from rest_framework import serializers

from .models import (
    Book,
    Character,
    CharacterReferencePhoto,
    CharacterVersion,
    CoverVersion,
    Page,
    PageVersion,
)


class BookSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        if instance is not None and "art_style" in attrs:
            if attrs["art_style"] != instance.art_style:
                raise serializers.ValidationError(
                    {"art_style": "Book style cannot be changed after creation."}
                )
        return attrs

    class Meta:
        model = Book
        exclude = ["user", "session_key"]


class CharacterSerializer(serializers.ModelSerializer):
    reference_photos = serializers.SerializerMethodField(read_only=True)

    def get_reference_photos(self, obj):
        request = self.context.get("request")
        urls = [photo.image.url for photo in obj.reference_photos.all() if photo.image]

        if not urls and obj.reference_photo:
            urls = [obj.reference_photo.url]

        if request:
            return [request.build_absolute_uri(url) for url in urls]
        return urls

    class Meta:
        model = Character

        exclude = ["created_by_anon_token", "user"]


class CharacterVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CharacterVersion
        fields = "__all__"


class CoverVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoverVersion

        exclude = ["created_by_anon_token", "created_by_user"]


class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = "__all__"


class PageVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageVersion
        fields = "__all__"
