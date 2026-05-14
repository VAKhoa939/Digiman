import logging

from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..serializers.manga_model_serializers import MangaTitleSerializer
from ..services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)


class RecommendationsView(APIView):
    """GET /api/recommendations/?manga_id=<uuid>

    Returns a list of manga that share the same author or genres as the
    given manga, sorted by reader count (descending).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        manga_id = request.query_params.get("manga_id")
        if not manga_id:
            return Response(
                {"detail": "manga_id query parameter is required."},
                status=400,
            )
        qs = RecommendationService.get_recommendations(manga_id, limit=10)
        serializer = MangaTitleSerializer(qs, many=True)
        return Response(serializer.data)


class HomepagePopularView(APIView):
    """GET /api/homepage/popular/

    Returns manga sorted by average star rating (highest first).
    Manga with no ratings appear at the end.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        qs = RecommendationService.get_popular(limit=12)
        serializer = MangaTitleSerializer(qs, many=True)
        return Response(serializer.data)


class HomepageMostReadView(APIView):
    """GET /api/homepage/most-read/

    Returns manga sorted by the number of distinct readers (highest first).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        qs = RecommendationService.get_most_read(limit=12)
        serializer = MangaTitleSerializer(qs, many=True)
        return Response(serializer.data)


class HomepageRecommendationView(APIView):
    """GET /api/homepage/recommendation/

    Returns personalised recommendation banners for the authenticated reader.
    Each banner contains:
      - source_manga: the manga from the reader's history that was used as seed
      - recommendations: list of manga similar to that seed

    Number of banners: random 1–3.
    Requires a valid JWT (IsAuthenticated).

    Response shape:
    {
      "banners": [
        {
          "source_manga": { ...MangaTitleSerializer fields... },
          "recommendations": [ { ...MangaTitleSerializer fields... }, ... ]
        }
      ]
    }
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        banners_raw = RecommendationService.get_homepage_recommendation(
            reader_id=request.user.id
        )
        banners = []
        for banner in banners_raw:
            banners.append({
                "source_manga": MangaTitleSerializer(banner["source_manga"]).data,
                "recommendations": MangaTitleSerializer(
                    banner["recommendations"], many=True
                ).data,
            })
        return Response({"banners": banners})
