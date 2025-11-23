from rest_framework import serializers
from ..models.reader_models import ReaderPreferences, LibraryList, ReadingProgress


class ReaderPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReaderPreferences
        fields = [
            "id", "reader_id", "theme_mode", "page_display_style", 
            "reading_direction", "image_size_mode", "is_progress_bar_visible"
        ]
        read_only_fields = ["id", "reader_id"]


class LibraryListSerializer(serializers.ModelSerializer):
    reader_name = serializers.SerializerMethodField()
    manga_title_count = serializers.SerializerMethodField()

    class Meta:
        model = LibraryList
        fields = [
            "id", "name", "visibility", "manga_titles", "created_at",
            "reader_id", "reader_name", "manga_title_count"
        ]
        read_only_fields = [
            "id", "created_at", "reader_id", "reader_name", "manga_title_count"
        ]

    def get_reader_name(self, obj: LibraryList) -> str:
        return obj.get_reader_name()

    def get_manga_title_count(self, obj: LibraryList) -> int:
        return obj.get_manga_title_count()


class ReadingProgressSerializer(serializers.ModelSerializer):
    manga_title_id = serializers.SerializerMethodField()

    class Meta:
        model = ReadingProgress
        fields = [
            "id", "reader_id", "chapter_id", "last_read_timestamp", "manga_title_id"
        ]
        read_only_fields = [*fields,]

    def get_manga_title_id(self, obj: ReadingProgress) -> str:
        return obj.get_manga_title().id
