import django_filters
from ..models.manga_models import MangaTitle

class MangaTitleFilter(django_filters.FilterSet):
    # Single-value filters
    author_id = django_filters.UUIDFilter(field_name="author__id")
    publication_status = django_filters.CharFilter(field_name="publication_status")
    
    # Multi-value (list) filter for genres
    genre_ids = django_filters.BaseInFilter(
        field_name="genres__id", lookup_expr="in"
    )

    class Meta:
        model = MangaTitle
        fields = ["author_id", "publication_status", "genre_ids"]
