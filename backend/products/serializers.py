from rest_framework import serializers

from .models import (
    Book,
    Character,
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
    class Meta:
        model = Character
        fields = "__all__"
        exclude = ["created_by_anon_token", "user"]


class CharacterVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CharacterVersion
        fields = "__all__"


class CoverVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoverVersion
        fields = "__all__"
        exclude = ["created_by_anon_token", "created_by_user"]


class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = "__all__"


class PageVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageVersion
        fields = "__all__"
