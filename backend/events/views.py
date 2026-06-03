import re

from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Category, Event, Order, RaceResult, Ticket
from .serializers import (
    EventDetailSerializer, EventListSerializer, OrderCreateSerializer,
    OrderSerializer, OrganizerEventSerializer, TicketSerializer,
)

CATEGORY_EMOJI = {
    "MUSIC": "🎵", "SPORT": "⚽", "MARATHON": "🏃", "CONFERENCE": "🎤",
    "THEATRE": "🎭", "FESTIVAL": "🎪", "COMEDY": "😂", "WORKSHOP": "🛠️",
    "OTHER": "🎟️",
}


class EventViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"

    def get_queryset(self):
        qs = Event.objects.filter(published=True).prefetch_related(
            "ticket_types", "checkpoints"
        )
        p = self.request.query_params
        if p.get("category"):
            qs = qs.filter(category=p["category"].upper())
        if p.get("featured") == "true":
            qs = qs.filter(featured=True)
        if p.get("q"):
            term = p["q"]
            qs = qs.filter(
                Q(title__icontains=term) | Q(city__icontains=term)
                | Q(venue__icontains=term) | Q(tagline__icontains=term)
            )
        return qs

    def get_serializer_class(self):
        return EventListSerializer if self.action == "list" else EventDetailSerializer

    @action(detail=True, methods=["get"])
    def leaderboard(self, request, slug=None):
        event = self.get_object()
        qs = RaceResult.objects.filter(
            ticket__ticket_type__event=event, status=RaceResult.Status.FINISHED
        ).select_related("ticket", "ticket__ticket_type")
        tt = request.query_params.get("ticket_type")
        if tt:
            qs = qs.filter(ticket__ticket_type_id=tt)
        qs = qs.order_by("chip_seconds")[:50]
        return Response([
            {
                "rank": i, "bib_number": r.ticket.bib_number,
                "name": r.ticket.holder_name, "distance": r.ticket.ticket_type.name,
                "chip_time": r.chip_time, "gun_time": r.gun_time,
            }
            for i, r in enumerate(qs, start=1)
        ])


@api_view(["GET"])
@permission_classes([AllowAny])
def categories(request):
    counts = dict(
        Event.objects.filter(published=True)
        .values_list("category")
        .annotate(n=Count("id"))
    )
    return Response([
        {"value": value, "label": label,
         "emoji": CATEGORY_EMOJI.get(value, "🎟️"), "count": counts.get(value, 0)}
        for value, label in Category.choices
    ])


class OrderViewSet(viewsets.GenericViewSet):
    queryset = Order.objects.prefetch_related(
        "tickets__ticket_type", "tickets__result", "tickets__splits__checkpoint"
    )
    lookup_field = "reference"

    def create(self, request):
        ser = OrderCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.validated_data["_user"] = (
            request.user if request.user.is_authenticated else None
        )
        order = ser.save()
        data = OrderSerializer(order).data
        payment = getattr(order, "_payment", None)
        if payment is not None:
            data["payment"] = payment   # Paynow redirect/poll/instructions
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def poll(self, request, reference=None):
        """Check payment status; issue tickets once Paynow confirms."""
        from . import payments
        order = get_object_or_404(self.get_queryset(), reference=reference)
        if order.status != Order.Status.PAID and payments.is_paid(order):
            order.mark_paid(order.payment_method, order.currency)
            order.save()
            order.issue_tickets()
        return Response(OrderSerializer(order).data)

    def retrieve(self, request, reference=None):
        order = get_object_or_404(self.get_queryset(), reference=reference)
        return Response(OrderSerializer(order).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def mine(self, request):
        orders = self.get_queryset().filter(buyer=request.user)
        return Response(OrderSerializer(orders, many=True).data)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def paynow_result(request):
    """Server-to-server callback from Paynow. Confirms payment & issues tickets."""
    from . import payments
    ref = request.data.get("reference") or request.query_params.get("reference")
    order = Order.objects.filter(reference=ref).first()
    if order and order.status != Order.Status.PAID and payments.is_paid(order):
        order.mark_paid(order.payment_method, order.currency)
        order.save()
        order.issue_tickets()
    return Response({"ok": True})


@api_view(["GET"])
@permission_classes([AllowAny])
def orders_by_phone(request):
    """Recover tickets with just a phone number — no login or email needed."""
    digits = re.sub(r"\D", "", request.query_params.get("phone", ""))
    if len(digits) < 9:
        return Response({"detail": "Please enter your full phone number."}, status=400)
    core = digits[-9:]  # match on the local part, ignoring 0/+263 prefixes
    orders = (
        Order.objects.filter(buyer_phone__contains=core, status=Order.Status.PAID)
        .prefetch_related("tickets__ticket_type", "tickets__result")
        .order_by("-created_at")[:20]
    )
    return Response(OrderSerializer(orders, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def ticket_lookup(request):
    qr = request.query_params.get("qr")
    bib = request.query_params.get("bib")
    qs = Ticket.objects.select_related(
        "ticket_type", "order", "result"
    ).prefetch_related("splits__checkpoint")
    ticket = None
    if qr:
        ticket = qs.filter(qr_token=qr).first()
    elif bib:
        ticket = qs.filter(bib_number=bib).first()
    if not ticket:
        return Response({"detail": "Ticket not found."}, status=404)
    return Response(TicketSerializer(ticket).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ticket_check_in(request, qr):
    ticket = get_object_or_404(Ticket, qr_token=qr)
    if ticket.event.owner_id != request.user.id:
        return Response({"detail": "Not your event."}, status=403)
    if ticket.status == Ticket.Status.CHECKED_IN:
        return Response({"detail": "Already checked in.",
                         "ticket": TicketSerializer(ticket).data}, status=200)
    ticket.check_in()
    ticket.save()
    return Response(TicketSerializer(ticket).data)


# --- Organizer ---------------------------------------------------------------
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def organizer_events(request):
    if request.method == "POST":
        ser = OrganizerEventSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        event = ser.save()
        return Response(
            OrganizerEventSerializer(event, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
    events = Event.objects.filter(owner=request.user).prefetch_related("ticket_types")
    return Response(
        OrganizerEventSerializer(events, many=True, context={"request": request}).data
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def organizer_dashboard(request, slug):
    event = get_object_or_404(Event, slug=slug, owner=request.user)
    tickets = Ticket.objects.filter(ticket_type__event=event).exclude(
        status=Ticket.Status.CANCELLED
    )
    orders = Order.objects.filter(event=event, status=Order.Status.PAID)

    revenue = {"USD": 0.0, "ZIG": 0.0}
    for row in orders.values("currency").annotate(total=Sum("total")):
        revenue[row["currency"]] = float(row["total"] or 0)

    payment_mix = {
        row["payment_method"]: row["n"]
        for row in orders.values("payment_method").annotate(n=Count("id"))
        if row["payment_method"]
    }

    by_type = [
        {"name": t.name, "sold": t.sold, "capacity": t.capacity,
         "pct": round(t.sold / t.capacity * 100) if t.capacity else 0,
         "revenue_usd": round(t.sold * float(t.price_usd), 2)}
        for t in event.ticket_types.all()
    ]

    recent = orders.order_by("-created_at")[:8]
    recent_orders = [
        {"reference": o.reference, "buyer_name": o.buyer_name,
         "count": o.tickets.count(), "total": float(o.total),
         "currency": o.currency, "created_at": o.created_at}
        for o in recent
    ]

    return Response({
        "event": EventDetailSerializer(event).data,
        "tickets_sold": tickets.count(),
        "checked_in": tickets.filter(status=Ticket.Status.CHECKED_IN).count(),
        "orders": orders.count(),
        "revenue": revenue,
        "payment_mix": payment_mix,
        "by_type": by_type,
        "recent_orders": recent_orders,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def organizer_cover(request, slug):
    """Upload an event cover image to DigitalOcean Spaces."""
    event = get_object_or_404(Event, slug=slug, owner=request.user)
    file = request.FILES.get("cover")
    if not file:
        return Response({"detail": "No file provided."}, status=400)
    event.cover_image = file
    event.save(update_fields=["cover_image"])
    return Response(
        OrganizerEventSerializer(event, context={"request": request}).data
    )
