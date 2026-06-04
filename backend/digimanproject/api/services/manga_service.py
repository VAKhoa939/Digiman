from django.db import transaction
from ..models.manga_models import MangaTitle, Page, Comment
from ..models.user_models import User
from ..models.common_choice_classes import ModerationStatusChoices
from ..services.image_service import ImageService, BucketNames
from ..services.system_service import LogEntryService
from ..tasks import enqueue_moderation_task

class MangaTitleService:
    @staticmethod
    @transaction.atomic
    def create_manga_title(data: dict, cover_image_file=None) -> MangaTitle:
        data = data.copy()

        # Handle cover upload
        cover_image_url = None
        if cover_image_file:
            cover_image_url = ImageService.upload_image(cover_image_file, BucketNames.MANGA_CONTENT)

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
        bucket = BucketNames.MANGA_CONTENT

        # Replace cover if a new one is provided
        if cover_image_file:
            # Upload new cover
            new_cover_image_url = ImageService.upload_image(cover_image_file, bucket)

            # Delete old cover if it exists
            if manga_title.cover_image:
                ImageService.delete_image(manga_title.cover_image, bucket)

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
            ImageService.delete_image(manga.cover_image, BucketNames.MANGA_CONTENT)
        manga.delete()
    

class PageService:
    @staticmethod
    @transaction.atomic
    def create_page(data: dict, image_file=None) -> Page:
        # Handle image upload
        image_url = None
        if image_file:
            image_url = ImageService.upload_image(image_file, BucketNames.MANGA_CONTENT)

        data = data.copy()
        if image_url:
            data["image_url"] = image_url

        page = Page.objects.create(**data)

        return page
    
    @staticmethod
    @transaction.atomic
    def update_page(page: Page, data: dict, image_file=None) -> Page:
        bucket = BucketNames.MANGA_CONTENT

        # Replace image if a new one is provided
        if image_file:
            # Upload new image
            new_image_url = ImageService.upload_image(image_file, bucket)

            # Delete old image if it exists
            if page.image_url:
                ImageService.delete_image(page.image_url, bucket)

            data["image_url"] = new_image_url

        # Update other fields
        page.update_metadata(**data)
        return page

    @staticmethod
    @transaction.atomic
    def delete_page(page: Page) -> None:
        # Delete image if it exists
        if page.image_url:
            try:
                ImageService.delete_image(page.image_url, BucketNames.MANGA_CONTENT)
            except Exception as e:
                # Ignore "not found" errors, log others
                if "not_found" not in str(e):
                    raise

        page.delete()


class CommentService:    
    @staticmethod
    def create_comment(data: dict, owner: User, image_file=None) -> Comment:
        # Validate data
        if not owner:
            raise ValueError("Owner is required.")
        if (not data.get("text")
            and not data.get("attached_image_url") 
            and not image_file
        ):
            raise ValueError("Either 'text' or 'attached_image' must be provided.")
        if not data.get("manga_title") and not data.get("chapter"):
            raise ValueError("Either 'manga_title' or 'chapter' must be provided.")

        # Handle image upload
        image_url = None
        if image_file:
            image_url = ImageService.upload_image(image_file, BucketNames.COMMENT_IMAGES)

        data = data.copy()
        data["owner"] = owner
        if image_url:
            data["attached_image_url"] = image_url

        # Add moderation status to data
        data["moderation_status"] = ModerationStatusChoices.PENDING

        # Create comment and log entry in a single transaction
        with transaction.atomic():
            comment = Comment.objects.create(**data)

            if getattr(comment, "_action_user", None) is None:
                comment._action_user = owner
            entry = LogEntryService.log_object_save(comment, True)

            # Run moderation pipeline after transaction
            transaction.on_commit(lambda: enqueue_moderation_task(entry.id))
        return comment
    
    @staticmethod
    def update_comment(comment: Comment, data: dict, image_file=None) -> Comment:
        # If the status is deleted, only the status should be updated
        status = data.get("status")
        if status and status == Comment.StatusChoices.DELETED:
            comment.set_deleted()
            LogEntryService.resolve_old_entries_and_flags(
                "comment",
                comment.id,
                ["text", "attached_image_url"]
            )
            return comment
        # If the status is not deleted and the status is changed, 
        # only the status and hidden_reasons should be updated
        elif status and status != comment.status and status in {
            Comment.StatusChoices.HIDDEN, Comment.StatusChoices.ACTIVE
        }:
            comment.toggle_hidden(data.get("hidden_reasons"))
            return comment
        
        # Validate data
        if (not data.get("text")
            and not data.get("attached_image_url") 
            and not image_file
        ):
            raise ValueError("Either 'text' or 'attached_image' must be provided.")
        if not data.get("manga_title") and not data.get("chapter"):
            raise ValueError("Either 'manga_title' or 'chapter' must be provided.")
        
        bucket = BucketNames.COMMENT_IMAGES
        data = data.copy()

        # Replace image if a new one is provided
        if image_file:
            # Upload new image
            new_image_url = ImageService.upload_image(image_file, bucket)

            # Delete old image if it exists
            if comment.attached_image_url:
                ImageService.delete_image(comment.attached_image_url, bucket)
            data["attached_image_url"] = new_image_url
        else:
            # Delete image if it's an empty string
            if data.get("attached_image_url") == "":
                ImageService.delete_image(comment.attached_image_url, bucket)
        
        # Update other comment fields and create log entry in a single transaction
        with transaction.atomic():
            if not comment.update_metadata(**data):
                return comment    # Nothing to update

            if getattr(comment, "_action_user", None) is None:
                comment._action_user = comment.owner
            entry = LogEntryService.log_object_save(comment, False)

            # Run moderation pipeline after transaction
            transaction.on_commit(lambda: enqueue_moderation_task(entry.id))
        return comment

    @staticmethod
    @transaction.atomic
    def delete_comment(comment: Comment) -> None:
        # Delete image if it exists
        if comment.attached_image_url:
            ImageService.delete_image(comment.attached_image_url, BucketNames.COMMENT_IMAGES)
        comment.delete()
        