from django.urls import path
from .views.image_view import ImageView

url_patterns = [
    path("image/", ImageView.as_view(), name="image"),
]