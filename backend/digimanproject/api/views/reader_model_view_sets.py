from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..models.manga_models import Chapter
from ..models.reader_models import ReadingProgress, MangaReaderStatistics
from ..serializers.reader_model_serializers import ReadingProgressSerializer, MangaReaderStatisticsSerializer
from ..services.reader_statistics_service import ReaderStatisticsService


class ReadingProgressViewSet(viewsets.ModelViewSet):
    serializer_class = ReadingProgressSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            ReadingProgress.objects
            .filter(reader=self.request.user)
            .select_related("chapter__manga_title")
            .order_by("-last_read_timestamp")
        )

    def create(self, request, *args, **kwargs):
        """Upsert reading progress for a chapter.

        Body: { "chapter_id": "<uuid>" }
        Returns 201 on first read, 200 on a re-visit (timestamp updated).
        The post_save signal on ReadingProgress will automatically update
        MangaReaderStatistics (is_reader_visited, is_reader_read).
        """
        chapter_id = request.data.get("chapter_id")
        if not chapter_id:
            return Response(
                {"detail": "chapter_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            chapter = Chapter.objects.select_related("manga_title").get(id=chapter_id)
        except Chapter.DoesNotExist:
            return Response(
                {"detail": "Chapter not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        progress, created = ReaderStatisticsService.upsert_reading_progress(
            reader_id=request.user.id,
            chapter=chapter,
        )
        serializer = self.get_serializer(progress)
        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=http_status)


class MangaReaderStatisticsViewSet(viewsets.ModelViewSet):
    serializer_class = MangaReaderStatisticsSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MangaReaderStatistics.objects.filter(reader=self.request.user)

    @action(detail=False, methods=["post"], url_path="mark-visited")
    def mark_visited(self, request):
        """Mark the reader as having visited a manga page.

        Body: { "manga_title_id": "<uuid>" }
        """
        manga_title_id = request.data.get("manga_title_id")
        if not manga_title_id:
            return Response(
                {"detail": "manga_title_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            stats = ReaderStatisticsService.mark_visited(request.user.id, manga_title_id)
        except Exception:
            return Response(
                {"detail": "Manga title not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(self.get_serializer(stats).data)

    @action(detail=False, methods=["post"], url_path="set-rating")
    def set_rating(self, request):
        """Set the reader's star rating (1–5) for a manga title.

        Body: { "manga_title_id": "<uuid>", "rating": <int 1-5> }
        """
        manga_title_id = request.data.get("manga_title_id")
        rating = request.data.get("rating")
        if not manga_title_id or rating is None:
            return Response(
                {"detail": "manga_title_id and rating are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            rating = int(rating)
        except (ValueError, TypeError):
            return Response(
                {"detail": "rating must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            stats = ReaderStatisticsService.set_star_rating(
                request.user.id, manga_title_id, rating
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(stats).data)