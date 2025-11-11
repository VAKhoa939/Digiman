from rest_framework import serializers
from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author


class MangaTitleSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    chapter_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = MangaTitle
        fields = [
            "id", "title", "author_name", "description", "cover_image", 
            "preview_chapter_id", "publication_status", "publication_date", 
            "is_visible", "chapter_count", "comment_count"
        ]
        read_only_fields = [
            "id", "publication_date", "chapter_count", "comment_count"
        ]

    def get_author_name(self, obj: MangaTitle) -> str:
        return obj.get_author_name()

    def get_chapter_count(self, obj: MangaTitle) -> int:
        return obj.get_chapter_count()

    def get_comment_count(self, obj: MangaTitle) -> int:
        return obj.get_comment_count()


class ChapterSerializer(serializers.ModelSerializer):
    page_count = serializers.SerializerMethodField()

    class Meta:
        model = Chapter
        fields = [
            "id", "manga_title_id", "title", "chapter_number", "upload_date",
            "page_count"
        ]
        read_only_fields = ["id", "manga_title_id", "upload_date", "page_count"]

    def get_page_count(self, obj: Chapter) -> int:
        return obj.get_page_count()


class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = [
            "id", "chapter_id", "page_number", "image_url",
        ]
        read_only_fields = [field for field in fields if field != "image_url"]


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "name"]
        read_only_fields = ["id"]


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ["id", "name"]
        read_only_fields = ["id"]
        