import django_filters
from ..models.manga_models import MangaTitle, Chapter

class MangaTitleFilter(django_filters.FilterSet):
    # Single-value filters
    author_name = django_filters.CharFilter(field_name="author__name", lookup_expr="icontains")
    publication_status = django_filters.BaseInFilter(
        field_name="publication_status", lookup_expr="in"
    )
    manga_title_id = django_filters.CharFilter(field_name="id", lookup_expr="exact")
    
    # Multi-value (list) filter for genres
    genre_names = django_filters.BaseInFilter(
        field_name="genres__name", lookup_expr="in"
    )

    class Meta:
        model = MangaTitle
        fields = ["author_name", "publication_status", "genre_names", "manga_title_id"]


class ChapterFilter(django_filters.FilterSet):
    manga_title_id = django_filters.CharFilter(field_name="manga_title__id", lookup_expr="exact")
    manga_title = django_filters.CharFilter(field_name="manga_title__title", lookup_expr="icontains")
    chapter_id = django_filters.CharFilter(field_name="id", lookup_expr="exact")

    class Meta:
        model = Chapter
        fields = [
            "manga_title_id", "manga_title", "chapter_id",
        ]
