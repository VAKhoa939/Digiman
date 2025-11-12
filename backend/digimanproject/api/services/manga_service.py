from django.db import transaction, models
from ..models.manga_models import MangaTitle, Page, Chapter
from ..services.image_service import ImageService, BucketNames
import uuid


class MangaService:
    @staticmethod
    @transaction.atomic
    def create_manga_title(data: dict, cover_image_file=None) -> MangaTitle:
        data = data.copy()

        # Handle cover upload
        image_service = ImageService()
        bucket = BucketNames.MANGA_CONTENT

        cover_image_url = None
        if cover_image_file:
            cover_image_url = image_service.upload_image(cover_image_file, bucket)

        if cover_image_url:
            data["cover_image"] = cover_image_url

        # Extract and temporarily remove genres
        genres = data.pop("genres", None)

        manga = MangaTitle.objects.create(**data)

        # Add genres
        if genres:
            for genre in genres:
                manga.add_genre(genre)

        return manga
    
    @staticmethod
    @transaction.atomic
    def update_manga_title(
        manga_title: MangaTitle, data: dict, cover_image_file=None
    ) -> MangaTitle:
        image_service = ImageService()
        bucket = BucketNames.MANGA_CONTENT

        # Replace cover if a new one is provided
        if cover_image_file:
            # Upload new cover
            new_cover_image_url = image_service.upload_image(cover_image_file, bucket)

            # Delete old cover if it exists
            if manga_title.cover_image:
                image_service.delete_image(manga_title.cover_image, bucket)

            data["cover_image"] = new_cover_image_url

        # Handle genres
        genres = data.pop("genres")
        if genres:
            manga_title.clear_genres()
            for genre in genres:
                manga_title.add_genre(genre)

        # Update other fields
        manga_title.update_metadata(**data)
        return manga_title
    
    @staticmethod
    @transaction.atomic
    def delete_manga_title(manga: MangaTitle) -> None:
        # Delete cover image if it exists
        if manga.cover_image:
            image_service = ImageService()
            bucket = BucketNames.MANGA_CONTENT
            image_service.delete_image(manga.cover_image, bucket)
        manga.delete()

    
    @staticmethod
    @transaction.atomic
    def create_page(data: dict, image_file=None) -> Page:
        image_service = ImageService()
        bucket = BucketNames.MANGA_CONTENT

        # Handle image upload
        image_url = None
        if image_file:
            image_url = image_service.upload_image(image_file, bucket)

        data = data.copy()
        if image_url:
            data["image_url"] = image_url

        page = Page.objects.create(**data)

        return page
    
    @staticmethod
    @transaction.atomic
    def update_page(page: Page, data: dict, image_file=None) -> Page:
        image_service = ImageService()
        bucket = BucketNames.MANGA_CONTENT

        # Replace image if a new one is provided
        if image_file:
            # Upload new image
            new_image_url = image_service.upload_image(image_file, bucket)

            # Delete old image if it exists
            if page.image_url:
                image_service.delete_image(page.image_url, bucket)

            data["image_url"] = new_image_url

        # Update other fields
        page.update_metadata(**data)
        return page

    @staticmethod
    @transaction.atomic
    def delete_page(page: Page) -> None:
        image_service = ImageService()
        bucket = BucketNames.MANGA_CONTENT

        # Delete image if it exists
        if page.image_url:
            try:
                image_service.delete_image(page.image_url, bucket)
            except Exception as e:
                # Ignore "not found" errors, log others
                if "not_found" not in str(e):
                    raise

        page.delete()
