from rest_framework import serializers
from urllib.parse import urlparse

class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField(required=True)
    bucket = serializers.CharField(required=True)

class ImageDeleteSerializer(serializers.Serializer):
    bucket = serializers.CharField(required=True)
    file_path = serializers.CharField(required=False)
    url = serializers.URLField(required=False)

    def validate(self, data):
        bucket = data.get("bucket")
        file_path = data.get("file_path")
        url = data.get("url")

        if not file_path and not url:
            raise serializers.ValidationError("Either 'file_path' or 'url' must be provided.")

        # If URL is given, extract the path part after /<bucket>/
        if url and not file_path:
            parsed = urlparse(url)
            path_parts = parsed.path.split(f"/{bucket}/", 1)
            if len(path_parts) == 2:
                data["file_path"] = path_parts[1]
            else:
                raise serializers.ValidationError("Invalid Supabase URL format.")

        return data
