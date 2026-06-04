from typing import Optional

from rest_framework import serializers

from ..models.reader_models import ReadingProgress, MangaReaderStatistics


class ReadingProgressSerializer(serializers.ModelSerializer):
    manga_title_id = serializers.SerializerMethodField()
    manga_title_title = serializers.SerializerMethodField()
    manga_title_cover = serializers.SerializerMethodField()
    chapter_number = serializers.SerializerMethodField()
    chapter_title = serializers.SerializerMethodField()

    class Meta:
        model = ReadingProgress
        fields = [
            "id",
            "reader_id",
            "chapter_id",
            "last_read_timestamp",
            "manga_title_id",
            "manga_title_title",
            "manga_title_cover",
            "chapter_number",
            "chapter_title",
        ]

    def _manga(self, obj: ReadingProgress):
        return obj.chapter.get_manga_title() if obj.chapter else None

    def get_manga_title_id(self, obj: ReadingProgress) -> Optional[str]:
        manga = self._manga(obj)
        return str(manga.id) if manga else None

    def get_manga_title_title(self, obj: ReadingProgress) -> Optional[str]:
        manga = self._manga(obj)
        return manga.title if manga else None

    def get_manga_title_cover(self, obj: ReadingProgress) -> Optional[str]:
        manga = self._manga(obj)
        return manga.cover_image if manga else None

    def get_chapter_number(self, obj: ReadingProgress) -> Optional[int]:
        return obj.chapter.chapter_number if obj.chapter else None

    def get_chapter_title(self, obj: ReadingProgress) -> Optional[str]:
        return obj.chapter.get_title() if obj.chapter else None


class MangaReaderStatisticsSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    read_count = serializers.SerializerMethodField()

    class Meta:
        model = MangaReaderStatistics
        fields = [
            "id",
            "reader_id",
            "manga_title_id",
            "is_reader_visited",
            "is_reader_read",
            "is_reader_commented",
            "star_rating",
            "average_rating",
            "read_count",
        ]

    def get_average_rating(self, obj: MangaReaderStatistics) -> float:
        from ..services.reader_statistics_service import ReaderStatisticsService
        return ReaderStatisticsService.get_average_rating(obj.manga_title_id)

    def get_read_count(self, obj: MangaReaderStatistics) -> int:
        from ..services.reader_statistics_service import ReaderStatisticsService
        return ReaderStatisticsService.get_read_count(obj.manga_title_id)
