from rest_framework import serializers
from ..models.reader_models import ReadingProgress, MangaReaderStatistics


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
    
class MangaReaderStatisticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = MangaReaderStatistics
        fields = [
            "id", "reader_id", "manga_title_id", "is_reader_visited",
            "is_reader_read", "is_reader_followed", "is_reader_commented",
        ]
        read_only_fields = ["id", "reader_id", "manga_title_id",]
