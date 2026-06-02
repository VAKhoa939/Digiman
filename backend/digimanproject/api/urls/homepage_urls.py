from django.urls import path

from ..views.homepage_views import (
    HomepageMostReadView,
    HomepagePopularView,
    HomepageRecommendationView,
    RecommendationsView,
)

urlpatterns = [
    path("recommendations/", RecommendationsView.as_view(), name="recommendations"),
    path("homepage/popular/", HomepagePopularView.as_view(), name="homepage-popular"),
    path("homepage/most-read/", HomepageMostReadView.as_view(), name="homepage-most-read"),
    path("homepage/recommendation/", HomepageRecommendationView.as_view(), name="homepage-recommendation"),
]
