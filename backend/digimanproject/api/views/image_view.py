from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from typing import Any

from ..serializers.image_serializers import ImageDeleteSerializer, ImageUploadSerializer
from ..services.image_service import ImageService
from ..permissions.image_permissions import CanManageImage

class ImageView(APIView):
    """Handles authenticated image operations with Supabase Storage."""

    permission_classes = [IsAuthenticated, CanManageImage]

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.image_service: ImageService = ImageService()

    def post(self, request: Request) -> Response:
        """
        Uploads an image to the given Supabase bucket and returns its public URL.

        Accepted request data fields: "image", "bucket"
        """
        serializer = ImageUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        file = serializer.validated_data["image"]
        bucket = serializer.validated_data["bucket"]

        try:
            image_url = self.image_service.upload_image(file, bucket)
            return Response({"url": image_url}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def delete(self, request: Request) -> Response:
        """
        Deletes an image from a Supabase bucket.

        Accepted query parameters: "bucket", "file_path", "image_url"

        Either "file_path" or "image_url" must be provided.
        """
        serializer = ImageDeleteSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        bucket = serializer.validated_data["bucket"]
        file_path = serializer.validated_data["file_path"]

        try:
            self.image_service.delete_image(bucket, file_path)
            return Response(
                {"message": f"Deleted '{file_path}' from '{bucket}'."},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)