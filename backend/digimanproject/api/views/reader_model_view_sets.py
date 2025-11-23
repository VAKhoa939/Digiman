from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..models.reader_models import ReaderPreferences, LibraryList, ReadingProgress
from ..serializers.reader_model_serializers import ReaderPreferencesSerializer, LibraryListSerializer, ReadingProgressSerializer


class ReaderPreferencesViewSet(viewsets.ModelViewSet):
    queryset = ReaderPreferences.objects.all()
    serializer_class = ReaderPreferencesSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]


class LibraryListViewSet(viewsets.ModelViewSet):
    queryset = LibraryList.objects.all()
    serializer_class = LibraryListSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]

    def get_queryset(self):
        return LibraryList.objects.filter(reader=self.request.user)
    

class ReadingProgressViewSet(viewsets.ModelViewSet):
    queryset = ReadingProgress.objects.all()
    serializer_class = ReadingProgressSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]

    def get_queryset(self):
        return ReadingProgress.objects.filter(reader=self.request.user)
    