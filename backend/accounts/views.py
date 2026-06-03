import requests
from django.conf import settings
from django.contrib.auth.models import User
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Profile


def _serialize(user):
    profile = getattr(user, "profile", None)
    return {
        "id": user.id,
        "name": (user.get_full_name() or user.username),
        "email": user.email,
        "avatar_url": profile.avatar_url if profile else "",
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def google_login(request):
    """
    Exchange a Google sign-in for a Ticketboy API token. Accepts either:
      { "credential": "<id_token>" }        (GIS button / One Tap), or
      { "access_token": "<oauth token>" }   (custom button popup flow).
    """
    credential = request.data.get("credential")
    access_token = request.data.get("access_token")
    info = None

    if credential:
        try:
            info = google_id_token.verify_oauth2_token(
                credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID,
            )
        except ValueError as exc:
            return Response({"detail": f"Invalid Google token: {exc}"},
                            status=status.HTTP_401_UNAUTHORIZED)
    elif access_token:
        # Confirm the token was issued for THIS app, then fetch the profile.
        try:
            ti = requests.get("https://oauth2.googleapis.com/tokeninfo",
                              params={"access_token": access_token}, timeout=10).json()
            if ti.get("aud") != settings.GOOGLE_CLIENT_ID and ti.get("azp") != settings.GOOGLE_CLIENT_ID:
                return Response({"detail": "Token not issued for this app."},
                                status=status.HTTP_401_UNAUTHORIZED)
            info = requests.get("https://www.googleapis.com/oauth2/v3/userinfo",
                                headers={"Authorization": f"Bearer {access_token}"},
                                timeout=10).json()
        except Exception as exc:
            return Response({"detail": f"Could not verify Google sign-in: {exc}"},
                            status=status.HTTP_401_UNAUTHORIZED)
    else:
        return Response({"detail": "Missing credential."}, status=400)

    email = info.get("email", "")
    sub = info.get("sub", "")
    if not email:
        return Response({"detail": "Google account has no email."}, status=400)

    user, _ = User.objects.get_or_create(
        username=email,
        defaults={
            "email": email,
            "first_name": info.get("given_name", "")[:30],
            "last_name": info.get("family_name", "")[:150],
        },
    )
    profile, _ = Profile.objects.get_or_create(user=user)
    profile.google_sub = sub
    profile.avatar_url = info.get("picture", "")
    profile.save()

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": _serialize(user)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(_serialize(request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
