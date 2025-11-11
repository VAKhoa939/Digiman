import uuid
from typing import BinaryIO
from ..utils.supabase_client import supabase

class ImageService:
    """Handles image uploads to Supabase Storage."""

    def upload_image(self, file: BinaryIO, bucket: str) -> str:
        """
        Upload an image to a given Supabase bucket and return the public URL.
        """
        try:
            file_ext: str = file.name.split('.')[-1]
            file_name: str = f"{uuid.uuid4()}.{file_ext}"
            file_bytes: bytes = file.read()

            response: dict = supabase.storage.from_(bucket).upload(file_name, file_bytes)
            # Check if the upload was successful
            if hasattr(response, "error") and response.error:
                raise Exception(response["error"]["message"])

            public_url: str = supabase.storage.from_(bucket).get_public_url(file_name)
            # Verify the public URL (optional, depending on your requirements)
            if not public_url:
                raise RuntimeError("Failed to retrieve the public URL of the uploaded file.")
            return public_url

        except Exception as e:
            # Rollback: Attempt to delete the file if it was uploaded
            try:
                supabase.storage.from_(bucket).remove([file_name])
            except Exception as rollback_error:
                # Log the rollback error (optional)
                print(f"Rollback failed: {rollback_error}")
            raise RuntimeError(f"Failed to upload image to bucket '{bucket}': {str(e)}")


    def delete_image(self, bucket: str, file_path: str) -> None:
        """
        Delete an image from a given Supabase bucket.
        Returns True if deletion succeeded.
        """
        response: dict = supabase.storage.from_(bucket).remove([file_path])
        if hasattr(response, "error") and response.error:
            raise RuntimeError(response["error"]["message"])
    
class BucketNames:
    USER_AVATARS = "user-avatars"
    COMMENT_IMAGES = "comment-images"
    MANGA_CONTENT = "manga-content"