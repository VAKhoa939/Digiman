from typing import Optional
from rest_framework import serializers
from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author, Comment
from ..services.manga_service import MangaTitleService
from datetime import datetime


class MangaTitleSerializer(serializers.ModelSerializer):
    """Fields for manga title: id, title, alternative_title, author_name, 
    description, cover_image, publication_status, publication_date,
    is_visible, first_free_chapter_amount, last_free_chapter_amount,
    chapter_count, comment_count, latest_chapter_date"""
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
            "publication_status", 
            "publication_date", 
            "is_visible",
            "is_premium",
            "first_free_chapter_amount",
            "last_free_chapter_amount",
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
    manga_title = serializers.SerializerMethodField()
    page_count = serializers.SerializerMethodField()
    previous_chapter_id = serializers.SerializerMethodField()
    next_chapter_id = serializers.SerializerMethodField()

    class Meta:
        model = Chapter
        fields = [
            "id", 
            "manga_title", 
            "manga_title_id", 
            "title", 
            "chapter_number", 
            "upload_date",
            "page_count", 
            "previous_chapter_id", 
            "next_chapter_id",
        ]
        read_only_fields = [
            field for field in fields if field not in {
                "title", "chapter_number", "manga_title_id",
            }
        ]

    def get_manga_title(self, obj: Chapter) -> str:
        return obj.get_manga_title_title()

    def get_page_count(self, obj: Chapter) -> int:
        return obj.get_page_count()
    
    def get_previous_chapter_id(self, obj: Chapter) -> Optional[str]:
        return MangaTitleService.get_previous_chapter_id(obj)
    
    def get_next_chapter_id(self, obj: Chapter) -> Optional[str]:
        return MangaTitleService.get_next_chapter_id(obj)


class PageSerializer(serializers.ModelSerializer):
    """Fields for page: id, chapter_id, page_number, image_url"""
    class Meta:
        model = Page
        fields = [
            "id", 
            "chapter_id", 
            "page_number", 
            "image_url",
        ]


class GenreSerializer(serializers.ModelSerializer):
    """Fields for genre: id, name"""
    class Meta:
        model = Genre
        fields = ["id", "name"]


class AuthorSerializer(serializers.ModelSerializer):
    """Fields for author: id, name"""
    class Meta:
        model = Author
        fields = ["id", "name"]
        

class CommentSerializer(serializers.ModelSerializer):
    """
    Fields for comment: id, owner_id, manga_title_id, chapter_id,
    parent_comment_id, text, attached_image_url, attached_image_upload,
    created_at, status, hidden_reasons, is_edited, owner_name, owner_avatar
    """
    owner_name = serializers.SerializerMethodField()
    owner_avatar = serializers.SerializerMethodField()
    manga_title = serializers.PrimaryKeyRelatedField(
        queryset=MangaTitle.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    chapter = serializers.PrimaryKeyRelatedField(
        queryset=Chapter.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    
    class Meta:
        model = Comment
        fields = [
            "id", 
            "owner_id", 
            "manga_title_id", 
            "chapter_id", 
            "parent_comment_id", 
            "text", 
            "attached_image_url",
            "created_at", 
            "status", 
            "hidden_reasons", 
            "is_edited", 
            "owner_name", 
            "owner_avatar",
            "manga_title", 
            "chapter",
        ]
    
    def get_owner_name(self, obj: Comment) -> str:
        return obj.get_owner_name()
    
    def get_owner_avatar(self, obj: Comment) -> str:
        return obj.get_owner_avatar()

    def validate(self, attrs):
        # Ensure `attached_image_url` is included in validated data even if it's an empty string
        if "attached_image_url" in self.initial_data:
            attrs["attached_image_url"] = self.initial_data.get("attached_image_url", None)
        return super().validate(attrs)
