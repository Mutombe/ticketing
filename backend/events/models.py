"""
Tikiti — general ticketing domain.

A single platform for ALL event types. The core loop:

    Organizer  ──creates──>  Event ──has──> TicketType(s)
    Customer   ──buys────>   Order ──issues──> Ticket(s)  (each with a QR)

Marathon is just one Category: its TicketTypes are distances and its Tickets
carry an optional bib + chip, plus optional Checkpoint/SplitTime/RaceResult.
"""
import secrets
import uuid

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Category(models.TextChoices):
    MUSIC = "MUSIC", "Music & Concerts"
    SPORT = "SPORT", "Sports"
    MARATHON = "MARATHON", "Marathon & Running"
    CONFERENCE = "CONFERENCE", "Conference"
    THEATRE = "THEATRE", "Theatre & Arts"
    FESTIVAL = "FESTIVAL", "Festival"
    COMEDY = "COMEDY", "Comedy"
    WORKSHOP = "WORKSHOP", "Workshop & Training"
    OTHER = "OTHER", "Other"


class Currency(models.TextChoices):
    USD = "USD", "US Dollar"
    ZIG = "ZIG", "Zimbabwe Gold (ZiG)"


class PaymentMethod(models.TextChoices):
    ECOCASH = "ECOCASH", "EcoCash"
    ONEMONEY = "ONEMONEY", "OneMoney"
    INNBUCKS = "INNBUCKS", "InnBucks"
    OMARI = "OMARI", "O'mari"
    ZIPIT = "ZIPIT", "ZimSwitch"
    CARD = "CARD", "Visa / Mastercard"


def _token():
    return uuid.uuid4().hex


def _ref():
    return "TKT-" + secrets.token_hex(4).upper()


# --- Event -------------------------------------------------------------------
class Event(models.Model):
    owner = models.ForeignKey(
        User, related_name="events", on_delete=models.CASCADE
    )
    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    category = models.CharField(
        max_length=12, choices=Category.choices, default=Category.MUSIC
    )
    tagline = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)

    venue = models.CharField(max_length=160, blank=True)
    city = models.CharField(max_length=80, default="Harare")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)

    cover_image = models.ImageField(upload_to="event-covers/", blank=True, null=True)
    cover_emoji = models.CharField(max_length=8, default="🎟️")

    base_currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.USD
    )
    zig_per_usd = models.DecimalField(max_digits=12, decimal_places=2, default=30)

    published = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at"]

    def __str__(self):
        return self.title

    @property
    def is_marathon(self):
        return self.category == Category.MARATHON

    @property
    def min_price(self):
        prices = [t.price_usd for t in self.ticket_types.all()]
        return min(prices) if prices else 0

    @property
    def capacity(self):
        return sum(t.capacity for t in self.ticket_types.all())

    @property
    def sold(self):
        return Ticket.objects.filter(
            ticket_type__event=self
        ).exclude(status=Ticket.Status.CANCELLED).count()


class TicketType(models.Model):
    event = models.ForeignKey(
        Event, related_name="ticket_types", on_delete=models.CASCADE
    )
    name = models.CharField(max_length=80)          # General / VIP / Full Marathon
    description = models.CharField(max_length=200, blank=True)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2)
    capacity = models.PositiveIntegerField(default=100)
    max_per_order = models.PositiveSmallIntegerField(default=10)
    sales_end = models.DateTimeField(null=True, blank=True)
    distance_km = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True
    )  # marathon only
    sort = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort", "price_usd"]

    def __str__(self):
        return f"{self.event.slug} · {self.name}"

    @property
    def price_zig(self):
        return round(float(self.price_usd) * float(self.event.zig_per_usd), 2)

    @property
    def sold(self):
        return self.tickets.exclude(status=Ticket.Status.CANCELLED).count()

    @property
    def remaining(self):
        return max(self.capacity - self.sold, 0)

    @property
    def on_sale(self):
        if self.sales_end and timezone.now() > self.sales_end:
            return False
        return self.remaining > 0


# --- Purchase ----------------------------------------------------------------
class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending payment"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"

    reference = models.CharField(
        max_length=16, unique=True, default=_ref, db_index=True
    )
    event = models.ForeignKey(Event, related_name="orders", on_delete=models.PROTECT)
    buyer = models.ForeignKey(
        User, related_name="orders", on_delete=models.SET_NULL, null=True, blank=True
    )
    buyer_name = models.CharField(max_length=120)
    buyer_email = models.EmailField(blank=True)
    buyer_phone = models.CharField(max_length=32, blank=True)

    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    payment_method = models.CharField(
        max_length=12, choices=PaymentMethod.choices, blank=True
    )
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.USD
    )
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Cart kept so tickets are issued only after payment confirms (Paynow flow).
    pending_items = models.JSONField(default=list, blank=True)
    poll_url = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} · {self.buyer_name}"

    def mark_paid(self, method, currency):
        self.payment_method = method
        self.currency = currency
        self.status = self.Status.PAID

    def issue_tickets(self):
        """Create the tickets for this order's cart (idempotent)."""
        if self.tickets.exists():
            return
        for item in (self.pending_items or []):
            tt = TicketType.objects.get(id=item["ticket_type"])
            for _ in range(int(item["quantity"])):
                t = Ticket(order=self, ticket_type=tt,
                           holder_name=item.get("holder_name") or self.buyer_name)
                t.assign_bib()
                t.save()
                if self.event.is_marathon:
                    RaceResult.objects.create(ticket=t)
        self.pending_items = []
        self.save(update_fields=["pending_items"])


class Ticket(models.Model):
    class Status(models.TextChoices):
        VALID = "VALID", "Valid"
        CHECKED_IN = "CHECKED_IN", "Checked in"
        CANCELLED = "CANCELLED", "Cancelled"

    order = models.ForeignKey(Order, related_name="tickets", on_delete=models.CASCADE)
    ticket_type = models.ForeignKey(
        TicketType, related_name="tickets", on_delete=models.PROTECT
    )
    holder_name = models.CharField(max_length=120)
    qr_token = models.CharField(max_length=64, unique=True, default=_token)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.VALID
    )
    # marathon extras
    bib_number = models.PositiveIntegerField(null=True, blank=True)
    chip_id = models.CharField(max_length=40, blank=True)

    checked_in_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["bib_number", "created_at"]

    def __str__(self):
        tag = f"#{self.bib_number}" if self.bib_number else self.qr_token[:8]
        return f"{self.holder_name} · {tag}"

    @property
    def event(self):
        return self.ticket_type.event

    def assign_bib(self):
        if self.bib_number or not self.event.is_marathon:
            return
        last = (
            Ticket.objects.filter(ticket_type=self.ticket_type)
            .exclude(bib_number__isnull=True)
            .order_by("-bib_number")
            .first()
        )
        base = (self.ticket_type.sort + 1) * 1000
        self.bib_number = (last.bib_number + 1) if last else base + 1
        self.chip_id = "CHIP-" + secrets.token_hex(4).upper()

    def check_in(self):
        self.status = self.Status.CHECKED_IN
        self.checked_in_at = timezone.now()


# --- Marathon timing extension (optional) ------------------------------------
class Checkpoint(models.Model):
    event = models.ForeignKey(
        Event, related_name="checkpoints", on_delete=models.CASCADE
    )
    name = models.CharField(max_length=60)
    distance_km = models.DecimalField(max_digits=5, decimal_places=1)
    is_start = models.BooleanField(default=False)
    is_finish = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "distance_km"]

    def __str__(self):
        return f"{self.event.slug} · {self.name}"


class SplitTime(models.Model):
    ticket = models.ForeignKey(
        Ticket, related_name="splits", on_delete=models.CASCADE
    )
    checkpoint = models.ForeignKey(
        Checkpoint, related_name="reads", on_delete=models.CASCADE
    )
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["recorded_at"]
        unique_together = ["ticket", "checkpoint"]


class RaceResult(models.Model):
    class Status(models.TextChoices):
        REGISTERED = "REGISTERED", "Registered"
        FINISHED = "FINISHED", "Finished"
        DNF = "DNF", "Did not finish"
        DNS = "DNS", "Did not start"

    ticket = models.OneToOneField(
        Ticket, related_name="result", on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.REGISTERED
    )
    gun_seconds = models.PositiveIntegerField(null=True, blank=True)
    chip_seconds = models.PositiveIntegerField(null=True, blank=True)
    overall_rank = models.PositiveIntegerField(null=True, blank=True)

    @staticmethod
    def fmt(seconds):
        if seconds is None:
            return None
        h, rem = divmod(int(seconds), 3600)
        m, s = divmod(rem, 60)
        return f"{h:01d}:{m:02d}:{s:02d}"

    @property
    def gun_time(self):
        return self.fmt(self.gun_seconds)

    @property
    def chip_time(self):
        return self.fmt(self.chip_seconds)
