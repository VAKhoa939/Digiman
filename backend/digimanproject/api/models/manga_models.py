from __future__ import annotations
from typing import Any, Optional
from datetime import datetime
from django.db import models
from django.utils import timezone

import uuid
from ..utils.helper_functions import update_instance

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .community_models import Comment

class Author(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    name: str = models.CharField(max_length=100)

    def __str__(self) -> str:
        return self.name
    

class Genre(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    name: str = models.CharField(max_length=50, unique=True)

    def __str__(self) -> str:
        return self.name


class MangaTitle(models.Model):
    class PublicationStatusChoices(models.TextChoices):
        ONGOING = "ongoing", "Ongoing"
        FINISHED = "finished", "Finished"
        DROPPED = "dropped", "Dropped"

    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    title: str = models.CharField(max_length=200)
    author: Optional["Author"] = models.ForeignKey(
        "Author", on_delete=models.SET_NULL, null=True)
    description: str = models.TextField(blank=True)
    cover_image: str = models.URLField(blank=True)
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
    
    def get_chapter_count(self) -> int:
        chapters: models.Manager["Chapter"] = self.chapters
        return chapters.count()
    
    def get_comment_count(self) -> int:
        comments: models.Manager["Comment"] = self.comments
        return comments.count()
    
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
        """allowed_fields: title, description, cover_image, preview_chapter,
        author_name, publication_status"""

        if "author_name" in metadata:
            self.add_author(metadata["author_name"])
            del metadata["author_name"]

        allowed_fields = {"title", "description", "cover_image", 
                          "preview_chapter", "publication_status"}
        update_instance(self, allowed_fields, **metadata)

    def add_author(self, author_name: str) -> "Author":
        author, _ = Author.objects.get_or_create(name=author_name)
        self.author = author
        self.save()

    def toggle_visibility(self) -> None:
        self.is_visible = not self.is_visible
        self.save()

    def add_genre(self, genre_name: str) -> "Genre":
        genre, _ = Genre.objects.get_or_create(name=genre_name)
        self.genres.add(genre)
        return genre

    def remove_genre(self, genre: Genre) -> bool:
        if genre in self.genres.all():
            self.genres.remove(genre)
            return True
        return False

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
    
    def get_page_count(self) -> int:
        pages: models.Manager["Page"] = self.pages
        return pages.count()
    
    def get_pages(self) -> models.QuerySet["Page"]:
        pages: models.Manager["Page"] = self.pages
        return pages.all()
    
    def get_manga_title(self) -> "MangaTitle":
        return self.manga_title
    
    def update_metadata(self, **metadata: Any) -> None:
        """allowed_fields: title, chapter_number"""
        allowed_fields = {"title", "chapter_number"}
        update_instance(self, allowed_fields, **metadata)

    def add_page(self, image_url: str) -> "Page":
        pages: models.Manager["Page"] = self.pages
        last_page_number = (
            pages.aggregate(models.Max("page_number"))["page_number__max"] or 0
        )
        return Page.objects.create(
            chapter=self,
            page_number=last_page_number + 1,
            image_url=image_url,
        )

    def remove_page(self, page: "Page") -> bool:
        current_number = page.page_number
        deleted, _ = page.delete()
        Page.objects.filter(
            chapter=self, page_number__gt=current_number
        ).update(page_number=models.F("page_number") - 1)
        return deleted > 0


class Page(models.Model):
    id: uuid.UUID = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    chapter: "Chapter" = models.ForeignKey(
        "Chapter", related_name="pages", on_delete=models.CASCADE)
    page_number: int = models.IntegerField()
    image_url: str = models.URLField()

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
