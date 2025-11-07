from django.urls import path
from ..views.image_view import ImageView

urlpatterns = [
    path("", ImageView.as_view(), name="image"),
]