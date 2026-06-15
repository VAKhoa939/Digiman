from django.contrib import admin
from django import forms
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils.html import format_html
from django.urls import reverse
from django.http import HttpRequest
from ..models.manga_models import MangaTitle, Chapter, Page, Genre, Author, Comment
from ..services.manga_service import MangaTitleService, PageService, CommentService
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
    attached_image_upload = forms.ImageField(
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
    fields = (
        "page_number", 
        "image_url", 
        "image_upload",
    )
    readonly_fields = ("id",)
    ordering = ("page_number",)


class CommentInline(admin.StackedInline):
    model = Comment
    form = CommentForm
    extra = 1
    fields = (
        "parent_comment", 
        "owner",
        "text", 
        "attached_image_url", 
        "attached_image_upload",
        "view_details",
    )
    readonly_fields = ("id", "created_at", "owner", "view_details",)
    ordering = ("-created_at",)
    
    def view_details(self, obj: Comment):
        if obj.pk and not obj._state.adding:
            url = reverse("admin:api_comment_change", args=[obj.pk])
            return format_html('<a href="{}">View</a>', url)
        return ""
    view_details.short_description = "View Comment Details"


class GenreInline(admin.TabularInline):
    model = MangaTitle.genres.through
    extra = 1


class ChapterInline(admin.TabularInline):
    model = Chapter
    extra = 1
    fields = (
        "title", 
        "chapter_number", 
        "upload_date", 
        "view_details",
    )
    readonly_fields = ("id", "upload_date", "view_details",)
    ordering = ("chapter_number",)
    
    def view_details(self, obj: Chapter):
        if obj.pk and not obj._state.adding:
            url = reverse("admin:api_chapter_change", args=[obj.pk])
            return format_html('<a href="{}">View</a>', url)
        return ""
    view_details.short_description = "View Chapter Details"


# --- Admin classes ---

@admin.register(MangaTitle)
class MangaTitleAdmin(LogUserMixin, admin.ModelAdmin):
    form = MangaTitleForm
    list_display = (
        "title", 
        "get_author_name", 
        "publication_status", 
        "is_visible", 
        "is_premium",
        "get_chapter_count", 
        "get_comment_count", 
        "get_latest_chapter_upload_date",
        "publication_date",
    )
    list_filter = ("publication_status", "is_visible")
    search_fields = ("title", "author__name")
    ordering = ("publication_date",)
    list_per_page = 20
    inlines = [ChapterInline, CommentInline]

    fieldsets = (
        ("Manga Details", {"fields": (
            "id",
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
            "is_premium",
            "first_free_chapter_amount",
            "last_free_chapter_amount",
        )}),
    )
    readonly_fields = ("id", "publication_date",)
    
    def save_model(
        self, request: HttpRequest, obj: MangaTitle, form: forms.ModelForm, change: bool
    ):
        # Attach the current user to the object for logging
        obj._action_user = request.user

        # Get the uploaded cover image file
        cover_image_file: InMemoryUploadedFile = form.cleaned_data.pop("cover_image_upload")

        if not change:
            # create form
            manga = MangaTitleService.create_manga_title(form.cleaned_data, cover_image_file)
            obj.pk = manga.pk
        else:
            # update form
            old_obj = MangaTitle.objects.get(pk=obj.pk)
            old_obj._action_user = request.user
            MangaTitleService.update_manga_title(old_obj, form.cleaned_data, cover_image_file)

    def delete_model(self, request, obj):
        # Attach the current user to the object for logging
        user = request.user
        obj._action_user = user

        MangaTitleService.delete_manga_title(obj)
    
    def save_formset(
        self, request: HttpRequest, form: forms.ModelForm, 
        formset: forms.BaseInlineFormSet, change: bool
    ):
        if formset.model == Chapter:
            return super().save_formset(request, form, formset, change)
          
        # Save with commit=False to populate .deleted_objects
        formset.save(commit=False)

        # Delete any marked-for-deletion Page\Comment objects
        if hasattr(formset, "deleted_objects"):
            for obj in formset.deleted_objects:
                if isinstance(obj, Comment):
                    CommentService.delete_comment(obj)
        else:
            # Fallback for Django versions where deleted_objects isn't populated yet
            for form_instance in formset.forms:
                if form_instance.cleaned_data.get("DELETE", False):
                    obj = form_instance.instance
                    if obj.pk and isinstance(obj, Comment):
                        CommentService.delete_comment(obj)

        # Filter out deleted forms
        active_forms = [
            f for f in formset.forms
            if not f.cleaned_data.get("DELETE", False)
        ]

        # Handle new or updated comments
        for form_instance in active_forms:
            obj = form_instance.instance
            if not isinstance(obj, Comment):
                # Chapter
                continue
            if not form_instance.has_changed():
                continue  # skip unchanged forms

            image_file = form_instance.cleaned_data.pop("attached_image_upload")
            if obj.pk:
                old_obj = Comment.objects.get(pk=obj.pk)
                CommentService.update_comment(old_obj, form_instance.cleaned_data, image_file)
            else:
                comment = CommentService.create_comment(form_instance.cleaned_data, request.user, image_file)
                obj.pk = comment.pk # Make sure the obj is attached

        formset.save_m2m()
    

@admin.register(Chapter)
class ChapterAdmin(LogUserMixin, admin.ModelAdmin):
    list_display = (
        "get_display_name", 
        "chapter_number", 
        "get_title", 
        "upload_date", 
        "is_premium",
        "get_page_count", 
        "get_comment_count", 
        "get_previous_chapter", 
        "get_next_chapter",
    )
    list_filter = ("manga_title",)
    search_fields = ("title", "manga_title__title")
    ordering = ("manga_title__title", "-upload_date")
    list_per_page = 20
    inlines = [PageInline, CommentInline]

    fieldset = (
        ("Chapter Details", {"fields": (
            "id",
            "manga_title", 
            "title", 
            "chapter_number", 
            "upload_date", 
            "is_premium",
            "get_page_count", 
            "get_comment_count", 
            "get_previous_chapter", 
            "get_next_chapter",
        )}),
    )
    readonly_fields = (
        "id",
        "upload_date",
        "is_premium",
    )

    def get_display_name(self, obj: Page) -> str:
        return str(obj)
    get_display_name.short_description = "Display name"
    
    def save_formset(
        self, request: HttpRequest, form: forms.ModelForm, 
        formset: forms.BaseInlineFormSet, change: bool
    ):
        # Save with commit=False to populate .deleted_objects
        formset.save(commit=False)

        # Delete any marked-for-deletion Page\Comment objects
        if hasattr(formset, "deleted_objects"):
            for obj in formset.deleted_objects:
                if isinstance(obj, Page):
                    PageService.delete_page(obj)
                if isinstance(obj, Comment):
                    CommentService.delete_comment(obj)
        else:
            # Fallback for Django versions where deleted_objects isn't populated yet
            for form_instance in formset.forms:
                if form_instance.cleaned_data.get("DELETE", False):
                    obj = form_instance.instance
                    if obj.pk and isinstance(obj, Page):
                        PageService.delete_page(obj)
                    if obj.pk and isinstance(obj, Comment):
                        CommentService.delete_comment(obj)

        # Filter out deleted forms
        active_forms = [
            f for f in formset.forms
            if not f.cleaned_data.get("DELETE", False)
        ]

        # Handle new or updated pages/comments
        for form_instance in active_forms:
            obj = form_instance.instance
            if not isinstance(obj, Page) and not isinstance(obj, Comment):
                continue
            if not form_instance.has_changed():
                continue  # skip unchanged forms

            if isinstance(obj, Page):
                print("saving page", str(obj))
                image_file = form_instance.cleaned_data.pop("image_upload")
                if obj.pk:
                    old_obj = Page.objects.get(pk=obj.pk)
                    PageService.update_page(old_obj, form_instance.cleaned_data, image_file)
                else:
                    page = PageService.create_page(form_instance.cleaned_data, image_file)
                    obj.pk = page.pk # Make sure the obj is attached
            if isinstance(obj, Comment):
                print("saving comment", str(obj))
                image_file = form_instance.cleaned_data.pop("attached_image_upload")
                if obj.pk:
                    old_obj = Comment.objects.get(pk=obj.pk)
                    CommentService.update_comment(old_obj, form_instance.cleaned_data, image_file)
                else:
                    comment = CommentService.create_comment(form_instance.cleaned_data, request.user, image_file)
                    obj.pk = comment.pk # Make sure the obj is attached

        formset.save_m2m()


@admin.register(Page)
class PageAdmin(LogUserMixin, admin.ModelAdmin):
    form = PageForm
    list_display = ("get_display_name", "chapter", "page_number", "image_url", )
    ordering = ("chapter", "page_number")
    list_per_page = 20
    fields = (
        "id",
        "chapter",
        "page_number",
        "image_url",
    )
    readonly_fields = ("id", "chapter",)

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
            page = PageService.create_page(form.cleaned_data, image_file)
            obj.pk = page.pk # Make sure the obj is attached
        else:
            old_obj = Page.objects.get(pk=obj.pk)
            old_obj._action_user = request.user
            PageService.update_page(old_obj, form.cleaned_data, image_file)

    def delete_model(self, request, obj):
        # Attach the current user to the object for logging
        user = request.user
        obj._action_user = user

        PageService.delete_page(obj)
    
    
@admin.register(Author)
class AuthorAdmin(LogUserMixin, admin.ModelAdmin):
    list_display = ("name", "get_manga_title_count",)
    list_per_page = 20


@admin.register(Genre)
class GenreAdmin(LogUserMixin, admin.ModelAdmin):
    list_display = ("name", "get_manga_title_count",)
    list_per_page = 20
        

@admin.register(Comment)
class CommentAdmin(LogUserMixin, admin.ModelAdmin):
    form = CommentForm
    list_display = (
        "get_display_name", 
        "owner", 
        "manga_title", 
        "chapter", 
        "created_at", 
        "get_parent_comment", 
        "status",
        "moderation_status",
    )
    list_per_page = 20
    list_filter = ("status", "created_at", "owner", "manga_title", "chapter",)
    ordering = ("manga_title", "chapter",)

    fields = (
        "id",
        "text", 
        "attached_image_url", 
        "attached_image_upload",
        "parent_comment", 
        "owner", 
        "manga_title", 
        "chapter",
        "created_at", 
        "status", 
        "hidden_reasons",
        "is_edited",
        "moderation_status",
        "last_moderated_at",
    )
    readonly_fields = ("id", "created_at", "owner", "is_edited", "last_moderated_at",)

    def get_display_name(self, obj: Comment) -> str:
        return str(obj)
    
    def get_parent_comment(self, obj: Comment) -> str:
        return str(obj.parent_comment)
    
    def save_model(
        self, request: HttpRequest, obj: Comment, 
        form: forms.ModelForm, change: bool
    ) :
        # Attach the current user to the object for logging
        obj._action_user = request.user

        # Get the uploaded image file
        image_file: InMemoryUploadedFile = form.cleaned_data.pop("attached_image_upload")
        print("attached_image_upload", image_file)

        if not change:
            comment = CommentService.create_comment(form.cleaned_data, request.user, image_file)
            obj.pk = comment.pk # Make sure the obj is attached
        else:
            old_obj = Comment.objects.get(pk=obj.pk)
            old_obj._action_user = request.user
            CommentService.update_comment(old_obj, form.cleaned_data, image_file)

    def delete_model(self, request, obj):
        # Attach the current user to the object for logging
        user = request.user
        obj._action_user = user

        CommentService.delete_comment(obj)