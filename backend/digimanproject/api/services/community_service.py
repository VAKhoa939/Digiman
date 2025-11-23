from typing import Optional
import uuid
from django.db import transaction
from ..models.community_models import Comment, Report, Notification
from ..models.user_models import User
from ..services.image_service import ImageService, BucketNames


class CommunityService:
    @staticmethod
    @transaction.atomic
    def create_comment(data: dict, owner: User, image_file=None) -> Comment:
        # Validate data
        if not owner:
            raise ValueError("Owner is required.")
        if (not data.get("text")
            and not data.get("attached_image_url") 
            and not data.get("attached_image_upload")
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

        comment = Comment.objects.create(**data)

        return comment
    
    @staticmethod
    @transaction.atomic
    def update_comment(comment: Comment, data: dict, image_file=None) -> Comment:
        if (not data.get("text")
            and not data.get("attached_image_url") 
            and not data.get("attached_image_upload")
        ):
            raise ValueError("Either 'text' or 'attached_image' must be provided.")
        if not data.get("manga_title") and not data.get("chapter"):
            raise ValueError("Either 'manga_title' or 'chapter' must be provided.")
        
        bucket = BucketNames.COMMENT_IMAGES

        # Replace image if a new one is provided
        if image_file:
            # Upload new image
            new_image_url = ImageService.upload_image(image_file, bucket)

            # Delete old image if it exists
            if comment.attached_image_url:
                ImageService.delete_image(comment.attached_image_url, bucket)
            data["attached_image_url"] = new_image_url

        # Update other fields
        comment.update_metadata(**data)
        return comment

    @staticmethod
    @transaction.atomic
    def delete_comment(comment: Comment) -> None:
        # Delete image if it exists
        if comment.attached_image_url:
            ImageService.delete_image(comment.attached_image_url, BucketNames.COMMENT_IMAGES)
        comment.delete()

    @staticmethod
    def get_comment_index(comment: Comment) -> Optional[int]:
        if comment.manga_title:
            comments = comment.manga_title.get_comments().order_by("created_at")
        elif comment.chapter:
            comments = comment.chapter.get_comments().order_by("created_at")
        else:
            return None
        return comments.filter(created_at__lte=comment.created_at).count()
    
    @staticmethod
    def get_comment_display_name(comment_id: uuid.UUID) -> str:
        return str(Comment.objects.get(id=comment_id))