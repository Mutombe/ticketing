from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from .models import (
    Category, Event, Order, PaymentMethod, RaceResult, SplitTime,
    Ticket, TicketType,
)


def cover_url(event):
    if event.cover_image:
        try:
            return event.cover_image.url
        except Exception:
            return ""
    return ""


class TicketTypeSerializer(serializers.ModelSerializer):
    sold = serializers.IntegerField(read_only=True)
    remaining = serializers.IntegerField(read_only=True)
    on_sale = serializers.BooleanField(read_only=True)
    price_zig = serializers.FloatField(read_only=True)

    class Meta:
        model = TicketType
        fields = [
            "id", "name", "description", "price_usd", "price_zig",
            "capacity", "max_per_order", "distance_km", "sort",
            "sold", "remaining", "on_sale",
        ]


class EventListSerializer(serializers.ModelSerializer):
    cover = serializers.SerializerMethodField()
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    min_price = serializers.FloatField(read_only=True)
    sold = serializers.IntegerField(read_only=True)
    is_marathon = serializers.BooleanField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "title", "slug", "category", "category_label", "tagline",
            "city", "venue", "starts_at", "cover", "cover_emoji",
            "min_price", "sold", "featured", "is_marathon",
        ]

    def get_cover(self, obj):
        return cover_url(obj)


class EventDetailSerializer(EventListSerializer):
    ticket_types = TicketTypeSerializer(many=True, read_only=True)
    description = serializers.CharField()
    organizer = serializers.CharField(source="owner.get_full_name", read_only=True)
    capacity = serializers.IntegerField(read_only=True)
    zig_per_usd = serializers.FloatField(read_only=True)
    checkpoints = serializers.SerializerMethodField()

    class Meta(EventListSerializer.Meta):
        fields = EventListSerializer.Meta.fields + [
            "description", "ends_at", "organizer", "ticket_types",
            "capacity", "zig_per_usd", "checkpoints",
        ]

    def get_checkpoints(self, obj):
        return [
            {"name": c.name, "distance_km": c.distance_km,
             "is_start": c.is_start, "is_finish": c.is_finish}
            for c in obj.checkpoints.all()
        ]


# --- Tickets / orders --------------------------------------------------------
class ResultSerializer(serializers.ModelSerializer):
    gun_time = serializers.CharField(read_only=True)
    chip_time = serializers.CharField(read_only=True)

    class Meta:
        model = RaceResult
        fields = ["status", "gun_time", "chip_time", "overall_rank"]


class SplitSerializer(serializers.ModelSerializer):
    checkpoint_name = serializers.CharField(source="checkpoint.name", read_only=True)
    distance_km = serializers.DecimalField(
        source="checkpoint.distance_km", max_digits=5, decimal_places=1, read_only=True
    )

    class Meta:
        model = SplitTime
        fields = ["id", "checkpoint_name", "distance_km", "recorded_at"]


class TicketSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source="event.title", read_only=True)
    event_slug = serializers.CharField(source="event.slug", read_only=True)
    event_category = serializers.CharField(source="event.category", read_only=True)
    event_starts_at = serializers.DateTimeField(source="event.starts_at", read_only=True)
    event_venue = serializers.CharField(source="event.venue", read_only=True)
    event_city = serializers.CharField(source="event.city", read_only=True)
    event_emoji = serializers.CharField(source="event.cover_emoji", read_only=True)
    ticket_type_name = serializers.CharField(source="ticket_type.name", read_only=True)
    order_reference = serializers.CharField(source="order.reference", read_only=True)
    result = ResultSerializer(read_only=True)
    splits = SplitSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "holder_name", "qr_token", "status", "bib_number", "chip_id",
            "ticket_type_name", "order_reference", "event_title", "event_slug",
            "event_category", "event_starts_at", "event_venue", "event_city",
            "event_emoji", "checked_in_at", "result", "splits",
        ]


class OrderSerializer(serializers.ModelSerializer):
    tickets = TicketSerializer(many=True, read_only=True)
    event_title = serializers.CharField(source="event.title", read_only=True)
    event_slug = serializers.CharField(source="event.slug", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "reference", "event_title", "event_slug", "buyer_name",
            "buyer_email", "buyer_phone", "status", "payment_method",
            "currency", "total", "created_at", "tickets",
        ]


class OrderItemSerializer(serializers.Serializer):
    ticket_type = serializers.PrimaryKeyRelatedField(queryset=TicketType.objects.all())
    quantity = serializers.IntegerField(min_value=1, max_value=20)
    holder_name = serializers.CharField(required=False, allow_blank=True)


class OrderCreateSerializer(serializers.Serializer):
    buyer_name = serializers.CharField(max_length=120)
    buyer_email = serializers.EmailField(required=False, allow_blank=True)
    buyer_phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(
        choices=[m[0] for m in PaymentMethod.choices]
    )
    currency = serializers.ChoiceField(choices=["USD", "ZIG"], default="USD")
    items = OrderItemSerializer(many=True)

    def validate(self, data):
        if not data["items"]:
            raise serializers.ValidationError("Your cart is empty.")
        event = None
        for item in data["items"]:
            tt = item["ticket_type"]
            if event is None:
                event = tt.event
            elif tt.event_id != event.id:
                raise serializers.ValidationError(
                    "All tickets must be for the same event."
                )
            if item["quantity"] > tt.remaining:
                raise serializers.ValidationError(
                    f"Only {tt.remaining} '{tt.name}' tickets left."
                )
        data["_event"] = event
        return data

    @transaction.atomic
    def create(self, validated):
        from django.conf import settings
        from . import payments

        event = validated["_event"]
        currency = validated.get("currency", "USD")
        rate = float(event.zig_per_usd) if currency == "ZIG" else 1.0
        method = validated["payment_method"]

        items = [
            {"ticket_type": it["ticket_type"].id, "quantity": it["quantity"],
             "holder_name": it.get("holder_name") or ""}
            for it in validated["items"]
        ]
        total = sum(
            float(it["ticket_type"].price_usd) * it["quantity"] for it in validated["items"]
        ) * rate

        order = Order.objects.create(
            event=event,
            buyer=validated.get("_user"),
            buyer_name=validated["buyer_name"],
            buyer_email=validated.get("buyer_email", ""),
            buyer_phone=validated.get("buyer_phone", ""),
            currency=currency,
            payment_method=method,
            total=round(total, 2),
            pending_items=items,
        )

        if settings.PAYNOW_ENABLED:
            # Real payment: issue tickets only after Paynow confirms.
            result = payments.initiate(order, method, order.buyer_phone)
            order.poll_url = result.get("poll_url", "")
            order.save(update_fields=["poll_url"])
            order._payment = result
        else:
            # Simulated instant payment (default until Paynow is configured).
            order.mark_paid(method, currency)
            order.save()
            order.issue_tickets()
        return order


# --- Organizer: create event with ticket types -------------------------------
class OrganizerTicketTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketType
        fields = ["name", "description", "price_usd", "capacity", "distance_km", "sort"]


class OrganizerEventSerializer(serializers.ModelSerializer):
    ticket_types = OrganizerTicketTypeSerializer(many=True)
    sold = serializers.IntegerField(read_only=True)
    cover = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id", "title", "slug", "category", "tagline", "description",
            "venue", "city", "starts_at", "ends_at", "cover_emoji", "cover",
            "zig_per_usd", "published", "featured", "ticket_types", "sold",
        ]
        read_only_fields = ["slug", "sold"]

    def get_cover(self, obj):
        return cover_url(obj)

    def _unique_slug(self, title):
        base = slugify(title)[:160] or "event"
        slug, i = base, 2
        while Event.objects.filter(slug=slug).exists():
            slug = f"{base}-{i}"
            i += 1
        return slug

    @transaction.atomic
    def create(self, validated):
        tt_data = validated.pop("ticket_types", [])
        validated["slug"] = self._unique_slug(validated["title"])
        validated["owner"] = self.context["request"].user
        event = Event.objects.create(**validated)
        for i, tt in enumerate(tt_data):
            TicketType.objects.create(event=event, sort=tt.get("sort", i), **{
                k: v for k, v in tt.items() if k != "sort"
            })
        return event
