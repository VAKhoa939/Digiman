from django.db import transaction
from ..models.community_models import Comment, Report, Notification
from ..services.image_service import ImageService, BucketNames


class CommunityService:
    @staticmethod
    @transaction.atomic
    def create_comment(data: dict, image_file=None) -> Comment:
        # Handle image upload
        image_url = None
        if image_file:
            image_url = ImageService.upload_image(image_file, BucketNames.COMMENT_IMAGES)

        data = data.copy()
        if image_url:
            data["content"] = image_url
            data["is_image"] = True
        else:
            data["is_image"] = False

        comment = Comment.objects.create(**data)

        return comment

    @staticmethod
    @transaction.atomic
    def delete_comment(comment: Comment) -> None:
        # Delete image if it exists
        if comment.is_image and comment.content:
            ImageService.delete_image(comment.content, BucketNames.COMMENT_IMAGES)
        comment.delete()