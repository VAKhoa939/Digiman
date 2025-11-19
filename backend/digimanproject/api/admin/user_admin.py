from django.contrib import admin
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.http import HttpRequest
from django.utils.safestring import mark_safe
from django import forms
from ..models.user_models import User, Reader, Administrator
from ..services.user_service import UserService, UserType
from .mixins import LogUserMixin


# --- Form classes ---

class UserAdminForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={"style": "width: 300px;"}),
        label="Password",
        required=False,
        help_text=mark_safe(
            "Leave blank to keep the current password. <br/>"
            "Click <button type='button' id='generate-password' class='btn btn-secondary btn-sm'>Generate Password</button> to generate a new password."
        ),
    )

    class Meta:
        model = User
        fields = "__all__"


class ReaderAdminForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={"style": "width: 300px;"}),
        label="Password",
        required=False,
        help_text=mark_safe(
            "Leave blank to keep the current password. <br/>"
            "Click <button type='button' id='generate-password' class='btn btn-secondary btn-sm'>Generate Password</button> to generate a new password."
        ),
    )
    avatar_upload = forms.ImageField(
        required=False,
        label="Upload Avatar",
        widget=forms.ClearableFileInput(attrs={"enctype": "multipart/form-data"})
    )

    class Meta:
        model = Reader
        fields = "__all__"


# --- Base User Admin class ---

class BaseUserAdmin(LogUserMixin, admin.ModelAdmin):
    list_display: tuple[str, ...] = ("username", "email", "role", "status", "created_at")
    list_filter: tuple[str, ...] = ("role", "status", "created_at")
    search_fields: tuple[str, ...] = ("username", "email")
    ordering: tuple[str, ...] = ("-created_at",)
    readonly_fields: tuple[str, ...] = ("created_at", "status")

    fields: tuple[str, ...] = ("username", "email", "password", "role", "status", "created_at")

    class Media:
        js = ("api/admin/password_generator.js",)

    def formfield_for_dbfield(self, db_field, **kwargs):
        formfield = super().formfield_for_dbfield(db_field, **kwargs)
        if db_field.name == "password":
            formfield.widget = forms.PasswordInput(attrs={"style": "width: 300px;"})
        return formfield

    def get_fields(self, request, obj=None):
        if not obj: # If this is a create form
            return [field for field in self.fields if field not in {"created_at", "status"}]
        return list(self.fields)


# --- User Admin classes ---

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserAdminForm

    def save_model(
        self, request: HttpRequest, obj: UserType, 
        form: forms.ModelForm, change: bool
    ) -> None:
        """
        Dynamically control model saving based on role field 
        when creating or updating a new user.
        """
        # Attach the current user to the object for logging
        user = request.user
        obj._action_user = user

        if not change:
            new_user = UserService.create_user(form.cleaned_data)
            obj.pk = new_user.pk # Make sure the obj is attached
        else:
            UserService.update_user(obj, form.cleaned_data)

        # Call the parent save_model for triggering the signals
        super().save_model(request, obj, form, change)


@admin.register(Reader)
class ReaderAdmin(BaseUserAdmin):
    form = ReaderAdminForm
    list_display: tuple[str, ...] = (*BaseUserAdmin.list_display, "display_name", "age")
    search_fields: tuple[str, ...] = (*BaseUserAdmin.search_fields, "display_name")
    readonly_fields: tuple[str, ...] = (*BaseUserAdmin.readonly_fields,)
    
    fields: tuple[str, ...] = (*BaseUserAdmin.fields, "display_name", "avatar", "avatar_upload", "age")
    
    def get_queryset(self, request: HttpRequest):
        """Filter the queryset to only include readers."""
        return UserAdmin.get_queryset(self, request).filter(role=User.RoleChoices.READER)


    def save_model(
        self, request: HttpRequest, obj: UserType, 
        form: forms.ModelForm, change: bool
    ) -> None:
        """
        Override save_model to handle avatar image upload.
        """
        # Attach the current user to the object for logging
        user = request.user
        obj._action_user = user

        # Get the uploaded avatar file
        avatar_file: InMemoryUploadedFile = form.cleaned_data.pop("avatar_upload")

        if not change:
            new_user = UserService.create_user(form.cleaned_data, avatar_file)
            obj.pk = new_user.pk # Make sure the obj is attached
        else:
            UserService.update_user(obj, form.cleaned_data, avatar_file)

        # Call the parent save_model for triggering the signals
        super().save_model(request, obj, form, change)


@admin.register(Administrator)
class AdministratorAdmin(BaseUserAdmin):
    form = ReaderAdminForm
    list_display: tuple[str, ...] = (*ReaderAdmin.list_display,)
    search_fields: tuple[str, ...] = (*ReaderAdmin.search_fields,)
    fields: tuple[str, ...] = (*ReaderAdmin.fields,)
    readonly_fields: tuple[str, ...] = (*ReaderAdmin.readonly_fields,)

    def get_queryset(self, request):
        """Filter the queryset to only include administrators."""
        return UserAdmin.get_queryset(self, request).filter(role=User.RoleChoices.ADMIN)

    def save_model(
        self, request: HttpRequest, obj: UserType, 
        form: forms.ModelForm, change: bool
    ) -> None:
        """
        Override save_model to handle avatar image upload.

        This method calls the ReaderAdmin's save_model method.
        """
        ReaderAdmin.save_model(self, request, obj, form, change)
