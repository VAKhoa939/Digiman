from typing import Optional
from rest_framework import serializers
from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author, Comment
from datetime import datetime


class MangaTitleSerializer(serializers.ModelSerializer):
    """Fields for manga title: id, title, alternative_title, author_name, 
    description, cover_image, publication_status, publication_date,
    is_visible, first_free_chapter_amount, last_free_chapter_amount,
    chapter_count, comment_count, latest_chapter_date,
    average_rating, read_count"""
    author_name = serializers.SerializerMethodField()
    chapter_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    latest_chapter_date = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    read_count = serializers.SerializerMethodField()

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
            "is_premium",
            "chapter_count", 
            "comment_count",
            "latest_chapter_date",
            "average_rating",
            "read_count",
        ]

    def get_author_name(self, obj: MangaTitle) -> str:
        return obj.get_author_name()

    def get_chapter_count(self, obj: MangaTitle) -> int:
        return obj.get_chapter_count()

    def get_comment_count(self, obj: MangaTitle) -> int:
        return obj.get_comment_count()
    
    def get_latest_chapter_date(self, obj: MangaTitle) -> datetime:
        return obj.get_latest_chapter_upload_date()

    def get_average_rating(self, obj: MangaTitle) -> float:
        from ..services.reader_statistics_service import ReaderStatisticsService
        return ReaderStatisticsService.get_average_rating(obj.id)

    def get_read_count(self, obj: MangaTitle) -> int:
        from ..services.reader_statistics_service import ReaderStatisticsService
        return ReaderStatisticsService.get_read_count(obj.id)


class ChapterSerializer(serializers.ModelSerializer):
    """Fields for chapter: id, manga_title_id, title, chapter_number, 
    upload_date, page_count"""
    manga_title = serializers.SerializerMethodField()
    page_count = serializers.SerializerMethodField()
    previous_chapter_id = serializers.SerializerMethodField()
    next_chapter_id = serializers.SerializerMethodField()
    is_premium = serializers.SerializerMethodField()

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
            "is_premium",
        ]

    def get_manga_title(self, obj: Chapter) -> str:
        return obj.get_manga_title_title()

    def get_page_count(self, obj: Chapter) -> int:
        return obj.get_page_count()
    
    def get_previous_chapter_id(self, obj: Chapter) -> Optional[str]:
        prev = obj.get_previous_chapter()
        return None if prev is None else prev.id
    
    def get_next_chapter_id(self, obj: Chapter) -> Optional[str]:
        next = obj.get_next_chapter()
        return None if next is None else next.id
    
    def get_is_premium(self, obj: Chapter) -> bool:
        return obj.is_premium()


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
    created_at, status, hidden_reasons, is_edited, moderation_status, last_moderated_at,
    owner_name, owner_avatar
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
    parent_comment = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(),
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
            "moderation_status",
            "last_moderated_at",
            "owner_name", 
            "owner_avatar",
            "manga_title", 
            "chapter",
            "parent_comment",
        ]
    
    def get_owner_name(self, obj: Comment) -> str:
        return obj.get_owner_name()
    
    def get_owner_avatar(self, obj: Comment) -> str:
        return obj.get_owner_avatar()

    def validate(self, attrs):
        # Ensure `attached_image_url` is included in validated data even if it's an empty string
        if "attached_image_url" in self.initial_data:
            attrs["attached_image_url"] = self.initial_data.get("attached_image_url", None)

        parent_comment = attrs.get("parent_comment")
        if parent_comment is None and self.instance is not None:
            parent_comment = self.instance.parent_comment

        # Validate reply thread context: reply must target the same manga/chapter as its parent.
        if parent_comment is not None:
            if self.instance is not None and parent_comment.id == self.instance.id:
                raise serializers.ValidationError({
                    "parent_comment": "A comment cannot reply to itself."
                })

            effective_manga = attrs.get("manga_title")
            if effective_manga is None and self.instance is not None:
                effective_manga = self.instance.manga_title

            effective_chapter = attrs.get("chapter")
            if effective_chapter is None and self.instance is not None:
                effective_chapter = self.instance.chapter

            if effective_manga != parent_comment.manga_title or effective_chapter != parent_comment.chapter:
                raise serializers.ValidationError({
                    "parent_comment": (
                        "Reply must belong to the same manga/chapter as its parent comment."
                    )
                })

        return super().validate(attrs)
