from __future__ import annotations
from typing import Any, Optional
from datetime import datetime
from django.db import models
from django.utils import timezone
from django.contrib import admin

import uuid
from ..utils.helper_functions import update_instance, update_instance, cast_user_to_subclass

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user_models import User

class Author(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    name: str = models.CharField(max_length=100, unique=True)

    def __str__(self) -> str:
        return self.name
    
    def get_name(self) -> str:
        return self.name
    
    def get_manga_titles(self) -> list["MangaTitle"]:
        manga_titles: models.Manager["MangaTitle"] = self.manga_titles
        return manga_titles.all()
    
    @admin.display(description="Number Of Manga Titles")
    def get_manga_title_count(self) -> int:
        manga_titles: models.Manager["MangaTitle"] = self.manga_titles
        return manga_titles.count()
    

class Genre(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    name: str = models.CharField(max_length=50, unique=True)

    def __str__(self) -> str:
        return self.name
    
    def get_name(self) -> str:
        return self.name
    
    def get_manga_titles(self) -> list["MangaTitle"]:
        manga_titles: models.Manager["MangaTitle"] = self.manga_titles
        return manga_titles.all()
    
    @admin.display(description="Number Of Manga Titles")
    def get_manga_title_count(self) -> int:
        manga_titles: models.Manager["MangaTitle"] = self.manga_titles
        return manga_titles.count()


class MangaTitle(models.Model):
    class PublicationStatusChoices(models.TextChoices):
        ONGOING = "ongoing", "Ongoing"
        FINISHED = "finished", "Finished"
        DROPPED = "dropped", "Dropped"

    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    title: str = models.CharField(max_length=500, unique=True)
    alternative_title: str = models.CharField(
        max_length=500, blank=True, null=True, default="")
    
    author: Optional["Author"] = models.ForeignKey(
        "Author", on_delete=models.SET_NULL, null=True, 
        related_name="manga_titles")
    description: str = models.TextField(blank=True)
    cover_image: str = models.URLField(blank=True, null=True, default="")

    publication_status: str = models.CharField(
        choices=PublicationStatusChoices.choices,
        default=PublicationStatusChoices.ONGOING)
    publication_date: datetime = models.DateTimeField(default=timezone.now)
    is_visible: bool = models.BooleanField(default=True)
    genres: models.ManyToManyField = models.ManyToManyField(
        "Genre", related_name="manga_titles")
    
    is_premium: bool = models.BooleanField(default=False)
    first_free_chapter_amount: int = models.IntegerField(default=0)
    last_free_chapter_amount: int = models.IntegerField(default=0)

    def __str__(self) -> str:
        return self.title
    
    @admin.display(
        description="Number Of Chapters"
    )
    def get_chapter_count(self) -> int:
        chapters: models.Manager["Chapter"] = self.chapters
        return chapters.count()
    
    @admin.display(
        description="Number Of Comments"
    )
    def get_comment_count(self) -> int:
        comments: models.Manager["Comment"] = self.comments
        return comments.count()
    
    @admin.display(
        description="Author",
        ordering="author__name"
    )
    def get_author_name(self) -> str:
        return self.author.get_name()
    
    def get_latest_chapter(self) -> "Chapter":
        chapters: models.Manager["Chapter"] = self.chapters
        return chapters.order_by("-upload_date").first()
    
    @admin.display(
        description="Latest Chapter Date"
    )
    def get_latest_chapter_upload_date(self) -> datetime:
        latest = self.get_latest_chapter()
        return latest.upload_date if latest else self.publication_date
    
    def get_genres(self) -> models.QuerySet["Genre"]:
        genres: models.Manager["Genre"] = self.genres
        return genres.all()
    
    def get_chapters(self) -> models.QuerySet["Chapter"]:
        chapters: models.Manager["Chapter"] = self.chapters
        return chapters.all().order_by("chapter_number")
    
    def get_comments(self) -> models.QuerySet["Comment"]:
        comments: models.Manager["Comment"] = self.comments
        return comments.all()

    def update_metadata(self, **metadata: Any) -> None:
        """allowed_fields: title, alternative_title, author, description, 
        cover_image, publication_status, is_visible, is_premium,
        first_free_chapter_amount, last_free_chapter_amount"""

        allowed_fields = {
            "title",
            "alternative_title",
            "author",
            "description",
            "cover_image",
            "publication_status",
            "is_visible",
            "is_premium",
            "first_free_chapter_amount",
            "last_free_chapter_amount",
        }
        update_instance(self, allowed_fields, **metadata)

    def add_genre(self, genre: "Genre") -> None:
        self.genres.add(genre)

    def remove_genre(self, genre: "Genre") -> bool:
        if genre in self.genres.all():
            self.genres.remove(genre)
            return True
        return False
    
    def clear_genres(self) -> None:
        self.genres.clear()


class Chapter(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    manga_title: "MangaTitle" = models.ForeignKey(
        "MangaTitle", related_name="chapters", on_delete=models.CASCADE)
    title: str = models.CharField(max_length=200, blank=True)
    chapter_number: int = models.IntegerField()
    upload_date: datetime = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"{self.manga_title} - Chapter {self.chapter_number}"
    
    @admin.display(
        description="Title"
    )
    def get_title(self) -> str:
        return self.title if self.title else f"Chapter {self.chapter_number}"
    
    def get_manga_title(self) -> "MangaTitle":
        return self.manga_title
    
    @admin.display(
        description="Manga Title"
    )
    def get_manga_title_title(self) -> str:
        return str(self.manga_title)
    
    def get_chapter_number(self) -> int:
        return self.chapter_number
    
    @admin.display(
        description="Number of pages"
    )
    def get_page_count(self) -> int:
        pages: models.Manager["Page"] = self.pages
        return pages.count()
    
    @admin.display(
        description="Number of of comments"
    )
    def get_comment_count(self) -> int:
        comments: models.Manager["Comment"] = self.comments
        return comments.count()
    
    def get_pages(self) -> models.QuerySet["Page"]:
        pages: models.Manager["Page"] = self.pages
        return pages.all()
    
    def get_comments(self) -> models.QuerySet["Comment"]:
        comments: models.Manager["Comment"] = self.comments
        return comments.all()
    
    def update_metadata(self, **metadata: Any) -> None:
        """allowed_fields: title, chapter_number"""
        allowed_fields = {"title", "chapter_number"}
        update_instance(self, allowed_fields, **metadata)

    def get_last_page_number(self) -> int:
        pages: models.Manager["Page"] = self.pages
        return (
            pages.aggregate(models.Max("page_number"))["page_number__max"] or 0
        )


class Page(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    chapter: "Chapter" = models.ForeignKey(
        "Chapter", related_name="pages", on_delete=models.CASCADE)
    page_number: int = models.IntegerField()
    image_url: str = models.URLField(blank=True, null=True, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['chapter', 'page_number'], 
                name='unique_page_per_chapter'
            )
        ]

    def __str__(self) -> str:
        return f"{self.chapter} - Page {self.page_number}"
    
    def update_metadata(self, **metadata: Any) -> None:
        """allowed_fields: page_number, image_url"""
        allowed_fields = {"page_number", "image_url"}
        update_instance(self, allowed_fields, **metadata)


class Comment(models.Model):
    class StatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        DELETED = "deleted", "Deleted"
        HIDDEN = "hidden", "Hidden"

    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    owner: Optional["User"] = models.ForeignKey(
        "User", null=True, blank=True, on_delete=models.SET_NULL, related_name="comments")
    manga_title: Optional["MangaTitle"] = models.ForeignKey(
        "MangaTitle", on_delete=models.CASCADE, null=True, blank=True, related_name="comments")
    chapter: Optional["Chapter"] = models.ForeignKey(
        "Chapter", on_delete=models.CASCADE, null=True, blank=True, related_name="comments")
    parent_comment: Optional["Comment"] = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE)
    
    text: str = models.TextField(max_length=2000, blank=True, null=True)
    attached_image_url: str = models.URLField(blank=True, null=True)
    created_at: datetime = models.DateTimeField(default=timezone.now)
    
    status: str = models.CharField(
        choices=StatusChoices.choices, 
        default=StatusChoices.ACTIVE
    )
    hidden_reasons: str = models.TextField(blank=True)
    is_edited: bool = models.BooleanField(default=False)

    def __str__(self) -> str:
        index = Comment.get_comment_index(self)
        where = self.manga_title if self.manga_title else self.chapter
        if index is not None:
            return f"Comment #{index} in {where}"
        else:
            return f"Comment by {self.get_owner_name()} at {self.created_at}"
        
    def get_owner_name(self) -> str:
        return (cast_user_to_subclass(self.owner).get_display_name() 
                if self.owner else "Guest")
    
    def get_owner_avatar(self) -> str:
        return (cast_user_to_subclass(self.owner).get_avatar() 
                if self.owner else "")

    def toggle_hidden(self, hidden_reasons: str = "") -> None:
        self.status = (
            Comment.StatusChoices.HIDDEN 
            if self.status == Comment.StatusChoices.ACTIVE else 
            Comment.StatusChoices.ACTIVE
        )
        self.hidden_reasons = hidden_reasons
        self.save(update_fields=["status", "hidden_reasons"])
    
    def set_deleted(self) -> None:
        self.status = Comment.StatusChoices.DELETED
        self.save(update_fields=["status"])

    def update_metadata(self, **metadata: Any) -> None:
        """Allowed fields: text, attached_image_url, status, hidden_reasons"""
        allowed_fields = {"text", "attached_image_url", "status", "hidden_reasons"}

        # set is_edited to True if any of the allowed fields are changed
        if not self.is_edited and any(field in allowed_fields for field in metadata.keys()):
            metadata["is_edited"] = True
            allowed_fields.add("is_edited")
            
        update_instance(self, allowed_fields, **metadata)

    @staticmethod
    def get_comment_index(comment: Comment) -> Optional[int]:
        if comment.manga_title:
            comments = comment.manga_title.get_comments().order_by("created_at")
        elif comment.chapter:
            comments = comment.chapter.get_comments().order_by("created_at")
        else:
            return None
        return comments.filter(created_at__lte=comment.created_at).count()
        