from django.contrib import admin
from django import forms
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils.html import format_html
from django.urls import reverse
from .base_permission_admin import BasePermissionAdmin
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
class MangaTitleAdmin(BasePermissionAdmin):
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
            "title", "author", "description", "cover_image", "cover_image_upload",
            "publication_date", "publication_status", "is_visible", "genres"
        )}),
    )
    
    def save_model(self, request, obj, form, change):
        # Get the uploaded cover image file
        cover_image_file: InMemoryUploadedFile = form.cleaned_data.get("cover_image_upload")
        if not change:
            # create form
            MangaService.create_manga_title(form.cleaned_data, cover_image_file)
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
        "title", "chapter_number", "upload_date", "get_page_count", "get_comment_count",
    )
    readonly_fields = ("upload_date",)
    ordering = ("chapter_number",)
    inlines = [PageInline]

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for obj in instances:
            if isinstance(obj, Page):
                image_file = formset.forms[0].cleaned_data.get("image_upload")
                if obj.pk:
                    MangaService.update_page(obj, formset.forms[0].cleaned_data, image_file)
                else:
                    MangaService.create_page(formset.forms[0].cleaned_data, image_file)
            obj.save()
        formset.save_m2m()

admin.site.register(Page)
admin.site.register(Comment)