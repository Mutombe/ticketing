from django.contrib import admin

from .models import (
    Checkpoint, Event, Order, RaceResult, SplitTime, Ticket, TicketType,
)


class TicketTypeInline(admin.TabularInline):
    model = TicketType
    extra = 0


class CheckpointInline(admin.TabularInline):
    model = Checkpoint
    extra = 0


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "city", "starts_at", "owner", "published", "featured"]
    list_filter = ["category", "published", "featured"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [TicketTypeInline, CheckpointInline]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["reference", "buyer_name", "event", "status", "total", "currency", "created_at"]
    list_filter = ["status", "payment_method", "currency"]
    search_fields = ["reference", "buyer_name", "buyer_email"]


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ["holder_name", "ticket_type", "bib_number", "status"]
    list_filter = ["status", "ticket_type__event"]
    search_fields = ["holder_name", "bib_number", "qr_token"]


admin.site.register([TicketType, Checkpoint, SplitTime, RaceResult])
admin.site.site_header = "Ticketboy · Operations"
admin.site.site_title = "Ticketboy Admin"
