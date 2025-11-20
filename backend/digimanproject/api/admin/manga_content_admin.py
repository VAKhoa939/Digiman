from django.contrib import admin
from django import forms
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils.html import format_html
from django.urls import reverse
from django.http import HttpRequest
from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author
from ..models.community_models import Comment
from ..services.manga_service import MangaService
from ..services.system_service import SystemService
from .mixins import LogUserMixin


# --- Form classes ---

class MangaTitleForm(forms.ModelForm):
    cover_image_upload = forms.ImageField(
        required=False,
        label="Upload Cover Image",
        widget=forms.ClearableFileInput(attrs={"enctype": "multipart/form-data"})
    )

    class Meta:
        model = MangaTitle
        fields = "__all__"


class PageForm(forms.ModelForm):
    image_upload = forms.ImageField(
        required=False,
        label="Upload Image",
        widget=forms.ClearableFileInput(attrs={"enctype": "multipart/form-data"})
    )

    class Meta:
        model = Page
        fields = "__all__"

class CommentForm(forms.ModelForm):
    image_upload = forms.ImageField(
        required=False,
        label="Upload Image",
        widget=forms.ClearableFileInput(attrs={"enctype": "multipart/form-data"})
    )

    class Meta:
        model = Comment
        fields = "__all__"


# --- Inline classes ---

class PageInline(admin.StackedInline):
    model = Page
    form = PageForm
    extra = 1
    fields = ("page_number", "image_url", "image_upload",)
    ordering = ("page_number",)
    per_page = 20


class GenreInline(admin.TabularInline):
    model = MangaTitle.genres.through
    extra = 1


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 1
    fields = ("owner", "content", "status", "created_at")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    per_page = 20


class ChapterInline(admin.TabularInline):
    model = Chapter
    extra = 1
    fields = ("title", "chapter_number", "upload_date", "edit_link",)
    readonly_fields = ("upload_date", "edit_link",)
    ordering = ("chapter_number",)
    per_page = 20
    
    def edit_link(self, obj: Chapter):
        if obj.pk:
            url = reverse("admin:api_chapter_change", args=[obj.pk])
            return format_html('<a href="{}">Edit</a>', url)
        return ""
    edit_link.short_description = "Edit Chapter"


# --- Admin class ---

@admin.register(MangaTitle)
class MangaTitleAdmin(LogUserMixin, admin.ModelAdmin):
    form = MangaTitleForm
    list_display = (
        "title", "get_author_name", "publication_status", "is_visible", 
        "get_chapter_count", "get_comment_count", 
        "get_latest_chapter_upload_date",
    )
    list_filter = ("publication_status", "is_visible")
    search_fields = ("title", "author_name")
    ordering = ("-publication_date",)
    readonly_fields = ("publication_date",)
    list_per_page = 20
    inlines = [ChapterInline, CommentInline]

    fieldsets = (
        ("Manga Details", {"fields": (
            "title", 
            "alternative_title",
            "author", 
            "description", 
            "cover_image", 
            "cover_image_upload",
            "publication_date", 
            "publication_status", 
            "is_visible", 
            "genres",
            "preview_chapter",
        )}),
    )
    
    def save_model(
        self, request: HttpRequest, obj: MangaTitle, form: forms.ModelForm, change: bool
    ):
        # Attach the current user to the object for logging
        obj._action_user = request.user

        # Get the uploaded cover image file
        cover_image_file: InMemoryUploadedFile = form.cleaned_data.pop("cover_image_upload")

        if not change:
            # create form
            manga = MangaService.create_manga_title(form.cleaned_data, cover_image_file)
            obj.pk = manga.pk
        else:
            # update form
            MangaService.update_manga_title(obj, form.cleaned_data, cover_image_file)
        # Call the parent save_model for triggering the signals
        super().save_model(request, obj, form, change)
    
    
@admin.register(Author)
class AuthorAdmin(LogUserMixin, admin.ModelAdmin):
    list_display = ("name", "get_manga_title_count",)
    list_per_page = 20


@admin.register(Genre)
class GenreAdmin(LogUserMixin, admin.ModelAdmin):
    list_display = ("name", "get_manga_title_count",)
    list_per_page = 20
    

@admin.register(Chapter)
class ChapterAdmin(LogUserMixin, admin.ModelAdmin):
    list_display = (
        "get_display_name", "chapter_number", "get_title", "upload_date", 
        "get_page_count", "get_comment_count", 
        "get_previous_chapter", "get_next_chapter",
    )
    list_filter = ("manga_title",)
    readonly_fields = ("upload_date",)
    search_fields = ("title", "manga_title__title")
    ordering = ("manga_title__title", "-upload_date")
    list_per_page = 20
    inlines = [PageInline, CommentInline]

    fieldset = (
        ("Chapter Details", {"fields": (
            "manga_title", 
            "title", 
            "chapter_number", 
            "upload_date", 
        )}),
    )

    def get_display_name(self, obj: Page) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"

    def get_previous_chapter(self, obj: Chapter) -> str:
        id = MangaService.get_previous_chapter_id(obj)
        return MangaService.get_chapter_display_name(id)
    get_previous_chapter.short_description = "Previous chapter"

    def get_next_chapter(self, obj: Chapter) -> str:
        id = MangaService.get_next_chapter_id(obj)
        return MangaService.get_chapter_display_name(id)
    get_next_chapter.short_description = "Next chapter"


@admin.register(Page)
class PageAdmin(LogUserMixin, admin.ModelAdmin):
    form = PageForm
    list_display = ("get_display_name", "chapter", "page_number", "image_url", )
    ordering = ("chapter", "page_number")
    list_per_page = 20

    def get_display_name(self, obj: Page) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"

    def save_model(
        self, request: HttpRequest, obj: Page, 
        form: forms.ModelForm, change: bool
    ) :
        # Attach the current user to the object for logging
        obj._action_user = request.user

        # Get the uploaded image file
        image_file: InMemoryUploadedFile = form.cleaned_data.pop("image_upload")

        if not change:
            page = MangaService.create_page(form.cleaned_data, image_file)
            obj.pk = page.pk # Make sure the obj is attached
        else:
            MangaService.update_page(obj, form.cleaned_data, image_file)
        # Call the parent save_model for triggering the signals
        super().save_model(request, obj, form, change)
        

admin.site.register(Comment)