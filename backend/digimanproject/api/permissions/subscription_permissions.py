from typing import Any

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import View


class PremiumChaptersPermission(permissions.BasePermission):
    """
    Permissions for accessing premium chapters. 
    Used by ChapterViewSet and PageViewSet.
    """
    def has_object_permission(self, request: Request, view: View, obj: Any) -> bool:
        """
        Check if the user has access to the premium chapter object or its page object
        """
        from ..models.user_models import Reader
        from ..models.manga_models import Chapter, Page
        from ..models.subscription_models import SubscriptionFeatureChoices
        from ..utils.helper_functions import cast_user_to_subclass

        # Check if the object is a premium Chapter or a page of a premium chapter
        # Non-premium chapters can be accessed by any user
        if isinstance(obj, Chapter):
            chapter = obj
        elif isinstance(obj, Page):
            chapter = obj.get_chapter()
        else:
            return False

        if not chapter.check_premium():
            return True
        
        # Check if the user is a premium user 
        # Only a Reader and higher account can access premium chapters
        # And an Admin always has access
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        user = cast_user_to_subclass(user)
        
        if user.check_admin_access():
            return True
        
        if isinstance(user, Reader):
            return user.check_subscription_feature_access(SubscriptionFeatureChoices.PREMIUM_CHAPTERS)
        
        # If this account is not a Reader or higher one, deny access
        return False
    
    def has_permission(self, request: Request, view: View) -> bool:
        """
        Check if the user has permission to fetch pages of a premium chapter.
        """
        from ..models.manga_models import Chapter

        chapter_id = request.query_params.get("chapter_id")
        if not chapter_id:
            return True

        try:
            chapter = Chapter.objects.get(id=chapter_id)
        except Chapter.DoesNotExist:
            return False
        
        # Use the has_object_permission method to check the permission for the chapter
        if not self.has_object_permission(request, view, chapter):
            return False

        # If the user has access to the premium chapter, run the parent permission method
        return super().has_permission(request, view)
        