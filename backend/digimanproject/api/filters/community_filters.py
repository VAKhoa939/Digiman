import django_filters

from ..models.community_models import Comment

class CommentFilter(django_filters.FilterSet):
    manga_title_id = django_filters.CharFilter(field_name="manga_title__id", lookup_expr="exact")
    chapter_id = django_filters.CharFilter(field_name="chapter__id", lookup_expr="exact")
    owner_id = django_filters.CharFilter(field_name="owner__id", lookup_expr="exact")

    class Meta:
        model = Comment
        fields = ["manga_title_id", "chapter_id", "owner_id"]