from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author
from ..serializers.manga_model_serializers import MangaTitleSerializer, ChapterSerializer, PageSerializer, GenreSerializer, AuthorSerializer

from ..filters.manga_filters import MangaTitleFilter, ChapterFilter
from ..permissions.admin_permissions import AdminWriteOnly
from django.db.models import Max


class MangaTitleViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows manga titles to be viewed (by all users) 
    or edited (by admins).

    The manga titles are filtered, searched, ordered, and paginated.
    Basic url pattern: 
    /api/manga-titles/?(filters)&search=(keyword)&ordering=(field)&page=(number)
    """
    queryset = MangaTitle.objects.all().distinct()
    serializer_class = MangaTitleSerializer
    permission_classes = [AdminWriteOnly]

    # Enable filtering, searching, ordering
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    filterset_class = MangaTitleFilter
    search_fields = ["title", "alternative_title"]
    ordering_fields = [
        "title",
        "publication_date",
        "created_at",
        "latest_chapter_date",
    ]
    ordering = ["-publication_date"]  # default

    def get_queryset(self):
        """Add prefetch/select related for performance"""
        return (MangaTitle.objects
            .filter(is_visible=True)
            .annotate(latest_chapter_date=Max("chapters__upload_date"))
            .select_related("author")
            .prefetch_related("genres")
        )


class ChapterViewSet(viewsets.ModelViewSet):
    queryset = Chapter.objects.all()
    serializer_class = ChapterSerializer
    permission_classes = [AdminWriteOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ChapterFilter
    ordering_fields = ["upload_date", "title", "chapter_number"]
    ordering = ["-chapter_number", "title"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get("no_paging") == "true":
            self.pagination_class = None
        return queryset
    

class PageViewSet(viewsets.ModelViewSet):
    queryset = Page.objects.all()
    pagination_class = None
    serializer_class = PageSerializer
    permission_classes = [AdminWriteOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        chapter_id = self.request.query_params.get("chapter_id")
        if chapter_id is not None:
            queryset = queryset.filter(chapter_id=chapter_id)
        return queryset
    

class GenreViewSet(viewsets.ModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [AdminWriteOnly]
    filter_backends = [OrderingFilter, SearchFilter]
    search_fields = ["name"]
    ordering_fields = ["name"]
    ordering = ["name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        manga_title_id = self.request.query_params.get("manga_title_id")
        if manga_title_id is not None:
            queryset = queryset.filter(manga_titles__id=manga_title_id)
        return queryset


class AuthorViewSet(viewsets.ModelViewSet):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer
    permission_classes = [AdminWriteOnly]
    search_fields = ["name"]
    filter_backends = [SearchFilter, OrderingFilter]
    ordering_fields = ["name"]
    ordering = ["name"]