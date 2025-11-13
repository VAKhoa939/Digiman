from django.contrib import admin
from django import forms
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils.html import format_html
from django.urls import reverse
from django.http import HttpRequest
from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author
from ..models.community_models import Comment
from ..services.manga_service import MangaService


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


# --- Inline classes ---

class PageInline(admin.StackedInline):
    model = Page
    form = PageForm
    extra = 1
    fields = ("page_number", "image_url", "image_upload",)
    ordering = ("page_number",)


class GenreInline(admin.TabularInline):
    model = MangaTitle.genres.through
    extra = 1


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 1
    fields = ("owner", "content", "status", "created_at")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)


class ChapterInline(admin.TabularInline):
    model = Chapter
    extra = 1
    fields = ("title", "chapter_number", "upload_date", "edit_link",)
    readonly_fields = ("upload_date", "edit_link",)
    ordering = ("chapter_number",)
    
    def edit_link(self, obj: Chapter):
        if obj.pk:
            url = reverse("admin:api_chapter_change", args=[obj.pk])
            return format_html('<a href="{}">Edit</a>', url)
        return ""
    edit_link.short_description = "Edit Chapter"


# --- Admin class ---

@admin.register(MangaTitle)
class MangaTitleAdmin(admin.ModelAdmin):
    form = MangaTitleForm
    list_display = (
        "title", "get_author_name", "publication_status", "is_visible", 
        "get_chapter_count", "get_comment_count"
    )
    list_filter = ("publication_status", "is_visible")
    search_fields = ("title", "author_name")
    ordering = ("-publication_date",)
    readonly_fields = ("publication_date",)
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
        # Get the uploaded cover image file
        cover_image_file: InMemoryUploadedFile = form.cleaned_data.pop("cover_image_upload")

        if not change:
            # create form
            manga = MangaService.create_manga_title(form.cleaned_data, cover_image_file)
            obj.pk = manga.pk
        else:
            # update form
            MangaService.update_manga_title(obj, form.cleaned_data, cover_image_file)
    
    
@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ("name", "get_manga_title_count",)

@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ("name", "get_manga_title_count",)

@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = (
        "chapter_number", "get_title", "get_manga_title_title", "upload_date", 
        "get_page_count", "get_comment_count",
    )
    list_filter = ("manga_title",)
    readonly_fields = ("upload_date",)
    ordering = ("chapter_number",)
    inlines = [PageInline, CommentInline]

    def save_formset(
        self, request: HttpRequest, form: forms.ModelForm, 
        formset: forms.BaseInlineFormSet, change: bool
    ):
        # Save with commit=False to populate .deleted_objects
        instances = formset.save(commit=False)

        # Delete any marked-for-deletion Page objects
        if hasattr(formset, "deleted_objects"):
            for obj in formset.deleted_objects:
                if isinstance(obj, Page):
                    MangaService.delete_page(obj)
        else:
            # Fallback for Django versions where deleted_objects isn't populated yet
            for form_instance in formset.forms:
                if form_instance.cleaned_data.get("DELETE", False):
                    obj = form_instance.instance
                    if obj.pk and isinstance(obj, Page):
                        MangaService.delete_page(obj)

        # Filter out deleted forms
        active_forms = [
            f for f in formset.forms
            if not f.cleaned_data.get("DELETE", False)
        ]

        # Handle new or updated pages
        for form_instance in active_forms:
            obj = form_instance.instance
            if not isinstance(obj, Page):
                continue
            if not form_instance.has_changed():
                continue  # skip unchanged forms

            image_file = form_instance.cleaned_data.pop("image_upload")

            if obj.pk:
                MangaService.update_page(obj, form_instance.cleaned_data, image_file)
            else:
                page = MangaService.create_page(form_instance.cleaned_data, image_file)
                obj.pk = page.pk

        formset.save_m2m()

admin.site.register(Page)
admin.site.register(Comment)