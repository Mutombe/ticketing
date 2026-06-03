from django.contrib.auth.models import User
from django.db import models


class Profile(models.Model):
    """Lightweight profile linked to Google sign-in."""

    user = models.OneToOneField(
        User, related_name="profile", on_delete=models.CASCADE
    )
    google_sub = models.CharField(max_length=64, blank=True, db_index=True)
    avatar_url = models.URLField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile<{self.user.email or self.user.username}>"
