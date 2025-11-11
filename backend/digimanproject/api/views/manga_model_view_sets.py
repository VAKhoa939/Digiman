from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author
from ..serializers.manga_model_serializers import MangaTitleSerializer, ChapterSerializer, PageSerializer, GenreSerializer, AuthorSerializer


class MangaTitleViewSet(viewsets.ModelViewSet):
    queryset = MangaTitle.objects.all()
    serializer_class = MangaTitleSerializer
    permission_classes = [AllowAny]


class ChapterViewSet(viewsets.ModelViewSet):
    queryset = Chapter.objects.all()
    serializer_class = ChapterSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        manga_title_id = self.request.query_params.get("manga_title_id")
        if manga_title_id is not None:
            queryset = queryset.filter(manga_title_id=manga_title_id)
        return queryset
    

class PageViewSet(viewsets.ModelViewSet):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        chapter_id = self.request.query_params.get("chapter_id")
        if chapter_id is not None:
            queryset = queryset.filter(chapter_id=chapter_id)
        return queryset
    

class GenreViewSet(viewsets.ModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [AllowAny]


class AuthorViewSet(viewsets.ModelViewSet):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer
    permission_classes = [AllowAny]