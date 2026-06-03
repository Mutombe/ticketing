from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("events", views.EventViewSet, basename="event")
router.register("orders", views.OrderViewSet, basename="order")

urlpatterns = [
    # explicit before router so "by-phone" isn't read as an order reference
    path("orders/by-phone/", views.orders_by_phone),
    path("", include(router.urls)),
    path("categories/", views.categories),
    path("payments/result/", views.paynow_result),
    path("tickets/lookup/", views.ticket_lookup),
    path("tickets/<str:qr>/check-in/", views.ticket_check_in),
    path("organizer/events/", views.organizer_events),
    path("organizer/events/<slug:slug>/dashboard/", views.organizer_dashboard),
    path("organizer/events/<slug:slug>/cover/", views.organizer_cover),
]
