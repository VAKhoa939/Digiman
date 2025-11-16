from rest_framework import serializers
from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author

from datetime import datetime

class MangaTitleSerializer(serializers.ModelSerializer):
    """Fields for manga title: id, title, alternative_title, author_name, 
    description, cover_image, preview_chapter_id, publication_status, 
    publication_date, chapter_count, comment_count"""
    author_name = serializers.SerializerMethodField()
    chapter_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    latest_chapter_date = serializers.SerializerMethodField()

    class Meta:
        model = MangaTitle
        fields = [
            "id", 
            "title", 
            "alternative_title",
            "author_name", 
            "description", 
            "cover_image", 
            "preview_chapter_id", 
            "publication_status", 
            "publication_date", 
            "chapter_count", 
            "comment_count",
            "latest_chapter_date",
        ]

    def get_author_name(self, obj: MangaTitle) -> str:
        return obj.get_author_name()

    def get_chapter_count(self, obj: MangaTitle) -> int:
        return obj.get_chapter_count()

    def get_comment_count(self, obj: MangaTitle) -> int:
        return obj.get_comment_count()
    
    def get_latest_chapter_date(self, obj: MangaTitle) -> datetime:
        return obj.get_latest_chapter_upload_date()


class ChapterSerializer(serializers.ModelSerializer):
    """Fields for chapter: id, manga_title_id, title, chapter_number, 
    upload_date, page_count"""
    page_count = serializers.SerializerMethodField()

    class Meta:
        model = Chapter
        fields = [
            "id", "manga_title_id", "title", "chapter_number", "upload_date",
            "page_count"
        ]

    def get_page_count(self, obj: Chapter) -> int:
        return obj.get_page_count()


class PageSerializer(serializers.ModelSerializer):
    """Fields for page: id, chapter_id, page_number, image_url"""
    class Meta:
        model = Page
        fields = [
            "id", "chapter_id", "page_number", "image_url",
        ]


class GenreSerializer(serializers.ModelSerializer):
    """Fields for genre: id, name"""
    class Meta:
        model = Genre
        fields = ["id", "name"]
        read_only_fields = ["id"]


class AuthorSerializer(serializers.ModelSerializer):
    """Fields for author: id, name"""
    class Meta:
        model = Author
        fields = ["id", "name"]
        read_only_fields = ["id"]
        