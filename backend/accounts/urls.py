from django.urls import path

from . import views

urlpatterns = [
    path("google/", views.google_login),
    path("me/", views.me),
    path("logout/", views.logout),
]
