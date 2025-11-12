from __future__ import annotations
from typing import Any, Optional
from datetime import datetime
from django.db import models
from django.utils import timezone
from django.contrib import admin

import uuid
from ..utils.helper_functions import update_instance

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .community_models import Comment

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
    title: str = models.CharField(max_length=200, unique=True)
    author: Optional["Author"] = models.ForeignKey(
        "Author", on_delete=models.SET_NULL, null=True, 
        related_name="manga_titles")
    description: str = models.TextField(blank=True)
    cover_image: str = models.URLField(blank=True, null=True, default="")
    publication_status: str = models.CharField(
        max_length=30,
        choices=PublicationStatusChoices.choices,
        default=PublicationStatusChoices.ONGOING)
    publication_date: datetime = models.DateTimeField(default=timezone.now)
    is_visible: bool = models.BooleanField(default=True)
    genres: models.ManyToManyField = models.ManyToManyField(
        "Genre", related_name="manga_titles")
    preview_chapter: Optional["Chapter"] = models.ForeignKey(
        "Chapter", on_delete=models.SET_NULL, null=True)

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
    
    @admin.display(
        description="Preview Chapter"
    )
    def get_preview_chapter_number(self) -> int:
        return self.preview_chapter.get_chapter_number()
    
    def get_genres(self) -> models.QuerySet["Genre"]:
        genres: models.Manager["Genre"] = self.genres
        return genres.all()
    
    def get_chapters(self) -> models.QuerySet["Chapter"]:
        chapters: models.Manager["Chapter"] = self.chapters
        return chapters.all()
    
    def get_comments(self) -> models.QuerySet["Comment"]:
        comments: models.Manager["Comment"] = self.comments
        return comments.all()

    def update_metadata(self, **metadata: Any) -> None:
        """allowed_fields: title, author, description, cover_image,
        publication_status, is_visible, preview_chapter"""

        allowed_fields = {
            "title", "author", "description", "cover_image", 
            "publication_status", "is_visible", "preview_chapter",
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

    def add_chapter(self, title: str, chapter_number: int) -> "Chapter":
        return Chapter.objects.create(
            manga_title=self, title=title, chapter_number=chapter_number
        )

    def remove_chapter(self, chapter: "Chapter") -> bool:
        deleted, _ = chapter.delete()
        return deleted > 0


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
        return self.manga_title
    
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

    def add_page(self, page_number: int, image_url: str) -> "Page":
        return Page.objects.create(
            chapter=self,
            page_number=page_number,
            image_url=image_url,
        )

    def remove_page(self, page: "Page") -> bool:
        deleted, _ = page.delete()
        return deleted > 0


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
