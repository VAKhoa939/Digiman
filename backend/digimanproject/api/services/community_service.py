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

        comment = Comment.objects.create(**data)

        return comment
    
    @staticmethod
    @transaction.atomic
    def update_comment(comment: Comment, data: dict, image_file=None) -> Comment:
        # If the status is deleted, only the status should be updated
        status = data.get("status")
        if status and status == Comment.StatusChoices.DELETED:
            comment.set_deleted()
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
        