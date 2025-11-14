from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from ..services.user_service import UserService
from rest_framework_simplejwt.views import TokenRefreshView


def set_refresh_cookie(response: Response, refresh_token: str, remember: bool):
    """Attach refresh token as HttpOnly cookie."""
    max_age = 7 * 24 * 3600 if remember else None  # 7 days if remember
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="Strict",
        max_age=max_age,
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        """Register a new user (creates Reader + auto login).
        
        Request data:
        - headers: "Content-Type: application/json",
        "Accept: application/json",
        "Origin: ... (frontend url)",
        "Referer: .../ (frontend url)",
        - body: "username", "email", "password", "remember"
        
        Response data:
        - headers: "Set-Cookie: refresh_token=... (HttpOnly)
        - body: "access"
        """
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")
        remember = request.data.get("remember", False)

        if not username or not email or not password:
            return Response(
                {"detail": "Missing fields."}, 
                status=status.HTTP_400_BAD_REQUEST)

        if UserService.check_user_exists(username, email):
            return Response(
                {"detail": "User already exists."}, 
                status=status.HTTP_400_BAD_REQUEST)

        user = UserService.create_user(
            {
                "username": username,
                "email": email,
                "password": password,
            }
        )

        # Issue JWT
        refresh = RefreshToken.for_user(user)
        response = Response(
            {"access": str(refresh.access_token)}, 
            status=status.HTTP_201_CREATED)
        set_refresh_cookie(response, str(refresh), remember)
        return response


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        """Login a user.
        
        Request data:
        - headers: "Content-Type: application/json",
        "Accept: application/json",
        "Origin: ... (frontend url)",
        "Referer: .../ (frontend url)",
        - body: "identifier", "password", "remember"
        
        Response data:
        - headers: "Set-Cookie: refresh_token=... (HttpOnly)
        - body: "access"
        """
        identifier = request.data.get("identifier") # username or email
        password = request.data.get("password")
        remember = request.data.get("remember", False)

        if not identifier or not password:
            return Response(
                {"detail": "Missing credentials."}, 
                status=status.HTTP_400_BAD_REQUEST)

        user = UserService.authenticate_user(request, identifier, password)
        if user is None:
            return Response(
                {"detail": "Invalid credentials."}, 
                status=status.HTTP_401_UNAUTHORIZED)

        # Issue JWT
        refresh = RefreshToken.for_user(user)
        response = Response({"access": str(refresh.access_token)})
        set_refresh_cookie(response, str(refresh), remember)
        return response
    

class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request: Request, *args, **kwargs) -> Response:
        """Refreshes the access token using the refresh token cookie.
        
        Request data:
        - headers: "Content-Type: application/json",
        "Accept: application/json",
        "Origin: ... (frontend url)",
        "Referer: .../ (frontend url)"
        - Cookie: "refresh_token=..."
        
        Response data:
        - body: "access"
        """
        refresh = request.COOKIES.get("refresh_token")
        if refresh is None:
            return Response(
                {"detail": "No refresh token cookie."}, 
                status=status.HTTP_400_BAD_REQUEST)
        request.data["refresh"] = refresh
        return super().post(request, *args, **kwargs)
    
    
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def post(self, request: Request) -> Response:
        """Logs out the user by deleting the refresh token cookie.

        Request data:
        - headers: "Content-Type: application/json",
        "Accept: application/json",
        "Origin: ... (frontend url)",
        "Referer: .../ (frontend url)",
        "Authorization: Bearer ... (access token)"
        - Cookie: "refresh_token=..."
        
        Response data:
        - body: "detail"
        """
        response = Response({"detail": "Logged out."}, status=200)
        response.delete_cookie("refresh_token")
        return response
    

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request: Request) -> Response:
        """Returns the current user's information.

        Request data:
        - headers: "Content-Type: application/json",
        "Accept: application/json",
        "Origin: ... (frontend url)",
        "Referer: .../ (frontend url)",
        "Authorization: Bearer ...(access token)"
        - Cookie: "refresh_token=..."
        
        Response data:
        - body: (User/Reader/Administrator data)
        """
        from ..models.user_models import User, Reader, Administrator
        from ..serializers.user_model_serializers import UserSerializer, ReaderSerializer, AdministratorSerializer
        
        user = request.user
        if not isinstance(user, User):
            return Response(
                {"detail": "Invalid user type."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the user is also a Reader or Administrator
        match user.role:
            case User.RoleChoices.READER:
                user = Reader.objects.get(pk=user.pk)
                serializer = ReaderSerializer(user)
            case User.RoleChoices.ADMIN:
                user = Administrator.objects.get(pk=user.pk)
                serializer = AdministratorSerializer(user)
            case _:
                serializer = UserSerializer(user)
        return Response(serializer.data)
