from django.db import transaction
from ..models.manga_models import MangaTitle, Page
from ..services.image_service import ImageService, BucketNames


class MangaService:
    @staticmethod
    @transaction.atomic
    def create_manga_title(data: dict, cover_image_file=None) -> MangaTitle:
        image_service = ImageService()
        bucket = BucketNames.MANGA_CONTENT

        # Handle cover upload
        cover_image_url = None
        if cover_image_file:
            cover_image_url = image_service.upload_image(cover_image_file, bucket)

        data = data.copy()
        if cover_image_url:
            data["cover_image"] = cover_image_url

        manga = MangaTitle.objects.create(**data)

        return manga
    
    @staticmethod
    @transaction.atomic
    def update_manga_title(manga: MangaTitle, data: dict, cover_image_file=None) -> MangaTitle:
        image_service = ImageService()
        bucket = BucketNames.MANGA_CONTENT

        # Replace cover if a new one is provided
        if cover_image_file:
            # Upload new cover
            new_cover_image_url = image_service.upload_image(cover_image_file, bucket)

            # Delete old cover if it exists
            if manga.cover_image:
                image_service.delete_image(manga.cover_image, bucket)

            data["cover_image"] = new_cover_image_url

        # Handle genres
        genres = data.get("genres")
        if genres:
            manga.genres.clear()
            for genre in genres:
                manga.genres.add(genre)
            # remove genres in data dict
            del data["genres"]

        # Update other fields
        for field, value in data.items():
            setattr(manga, field, value)

        manga.save()
        return manga
    
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
        for field, value in data.items():
            setattr(page, field, value)

        page.save()
        return page

    @staticmethod
    @transaction.atomic
    def delete_page(page: Page) -> None:
        # Delete image if it exists
        if page.image_url:
            image_service = ImageService()
            bucket = BucketNames.MANGA_CONTENT
            image_service.delete_image(page.image_url, bucket)
        page.delete()

    