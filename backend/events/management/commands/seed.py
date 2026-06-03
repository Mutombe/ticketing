"""
Seed Ticketboy with a diverse spread of Zimbabwean events — concerts, football,
a conference, comedy, a festival, and the Victoria Falls Marathon (with timing
+ results).

    python manage.py seed

Uses bulk_create so it seeds fast even over a remote (Neon) connection.
"""
import datetime as dt
import random

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from events.models import (
    Category, Event, Order, PaymentMethod, RaceResult, SplitTime,
    Ticket, TicketType,
)

FIRST = ["Tafadzwa", "Tatenda", "Rutendo", "Nyasha", "Kudzai", "Tendai", "Farai",
         "Chiedza", "Anesu", "Munashe", "Tinashe", "Vimbai", "Simba", "Rumbi",
         "Blessing", "Takudzwa", "Panashe", "Tanaka", "Shamiso", "Nokuthula",
         "Sibusiso", "Thandeka", "Mthokozisi", "Grace", "Brian", "Memory"]
LAST = ["Marange", "Moyo", "Ncube", "Sibanda", "Chikore", "Mutasa", "Dube",
        "Madziva", "Nkomo", "Mhlanga", "Gumbo", "Mpofu", "Mlambo", "Banda", "Phiri"]
PAY = [PaymentMethod.ECOCASH] * 4 + [PaymentMethod.ONEMONEY, PaymentMethod.INNBUCKS,
       PaymentMethod.ZIPIT, PaymentMethod.CARD, PaymentMethod.CARD]
BASE_TIME = {"Full Marathon": 2 * 3600 + 18 * 60, "Half Marathon": 65 * 60,
             "10 km Run": 31 * 60, "Fun Run": 22 * 60}


class Command(BaseCommand):
    help = "Seed diverse demo events (bulk, fast)."

    @transaction.atomic
    def handle(self, *args, **opts):
        rng = random.Random(2026)
        now = timezone.now()
        org, _ = User.objects.get_or_create(
            username="organizer@ticketboy.co.zw",
            defaults={"email": "organizer@ticketboy.co.zw",
                      "first_name": "Tendai", "last_name": "Events"},
        )
        # Clear in dependency order (Order/Ticket use PROTECT).
        Ticket.objects.all().delete()   # cascades RaceResult + SplitTime
        Order.objects.all().delete()
        Event.objects.all().delete()    # cascades TicketType + Checkpoint

        def mk(title, slug, cat, emoji, tagline, desc, venue, city, days, hours,
               featured=False):
            return Event.objects.create(
                owner=org, title=title, slug=slug, category=cat, cover_emoji=emoji,
                tagline=tagline, description=desc, venue=venue, city=city,
                featured=featured,
                starts_at=now + dt.timedelta(days=days, hours=hours))

        def tt(event, name, price, cap, sort, desc="", km=None):
            return TicketType.objects.create(
                event=event, name=name, price_usd=price, capacity=cap, sort=sort,
                description=desc, distance_km=km)

        # plan: list of (event, [ticket_types], n_orders)
        plan = []

        e = mk("Winky D: Eureka Live", "winky-d-eureka-live", Category.MUSIC, "🎤",
               "The Gaffa returns to Harare for one electric night.",
               "Zimbabwe's biggest Zimdancehall star live with a full band. "
               "Gates 5pm. Strictly no under-16s.",
               "Harare International Conference Centre", "Harare", 21, 18, True)
        plan.append((e, [
            tt(e, "General Admission", 15, 2000, 0, "Standing, main arena floor."),
            tt(e, "VIP", 40, 400, 1, "Raised deck, fast-track entry, cash bar."),
            tt(e, "VVIP Table (4)", 200, 40, 2, "Table for four, bottle service."),
        ], 220))

        e = mk("Dynamos vs Highlanders: Battle of Zimbabwe",
               "dynamos-vs-highlanders-2026", Category.SPORT, "⚽",
               "The fiercest derby in Zimbabwean football.",
               "DeMbare host Bosso at the home of football. Castle Lager PSL.",
               "Rufaro Stadium", "Harare", 10, 15, True)
        plan.append((e, [
            tt(e, "Bay (Terraces)", 5, 8000, 0, "Open terraces."),
            tt(e, "Grandstand", 12, 2000, 1, "Covered seating."),
            tt(e, "VIP Lounge", 35, 200, 2, "Padded seats, hospitality."),
        ], 300))

        e = mk("Zimbabwe Tech Summit 2026", "zim-tech-summit-2026",
               Category.CONFERENCE, "🎤",
               "Where Zimbabwe's builders, founders and investors meet.",
               "Two days of talks on fintech, AI and the startup economy. "
               "Includes lunch and the networking mixer.", "HICC", "Harare", 45, 8)
        plan.append((e, [
            tt(e, "Standard", 50, 600, 0, "Full 2-day access."),
            tt(e, "Student", 15, 200, 1, "Valid student ID required."),
            tt(e, "Executive", 150, 80, 2, "Front rows, speaker dinner, lounge."),
        ], 160))

        e = mk("Long John & Friends: Live Comedy", "long-john-live-comedy",
               Category.COMEDY, "😂", "An evening of the sharpest stand-up in the 263.",
               "Headlined by Long John with a stacked supporting line-up.",
               "7 Arts Theatre, Avondale", "Harare", 7, 19)
        plan.append((e, [
            tt(e, "Standard", 10, 300, 0),
            tt(e, "Front Row", 20, 40, 1, "Heckle at your own risk."),
        ], 90))

        e = mk("Victoria Falls Carnival 2026", "victoria-falls-carnival-2026",
               Category.FESTIVAL, "🎪", "Three days of music, fire and adventure by the Falls.",
               "Zimbabwe's premier New-Year festival, with local and international acts "
               "across three stages.", "Victoria Falls Town", "Victoria Falls", 90, 14, True)
        plan.append((e, [
            tt(e, "3-Day Pass", 75, 3000, 0, "Access to all three nights."),
            tt(e, "VIP 3-Day", 180, 300, 1, "VIP viewing, lounge, fast lane."),
        ], 180))

        # Marathon (already happened → results)
        em = mk("Victoria Falls Marathon 2026", "victoria-falls-marathon-2026",
                Category.MARATHON, "🏃",
                "Run across the bridge, between two nations, beside the Smoke that Thunders.",
                "Zimbabwe's flagship marathon. The route crosses the historic Victoria "
                "Falls Bridge into Zambia and back, with the spray of Mosi-oa-Tunya in "
                "view. Every level welcome.", "Victoria Falls Bridge", "Victoria Falls",
                -2, 5, True)
        dists = [
            tt(em, "Full Marathon", 45, 120, 0, "42.2 km · AIMS-certified.", km=42.2),
            tt(em, "Half Marathon", 35, 200, 1, "21.1 km · into Zambia and back.", km=21.1),
            tt(em, "10 km Run", 25, 300, 2, "10 km · scenic, beginner-friendly.", km=10),
            tt(em, "Fun Run", 12, 500, 3, "7.5 km · family fun run.", km=7.5),
        ]
        cps = [
            em.checkpoints.create(name="Start", distance_km=0, is_start=True, order=0),
            em.checkpoints.create(name="Bridge / Zambia", distance_km=7, order=1),
            em.checkpoints.create(name="10K", distance_km=10, order=2),
            em.checkpoints.create(name="Half", distance_km=21.1, order=3),
            em.checkpoints.create(name="30K", distance_km=30, order=4),
            em.checkpoints.create(name="Finish", distance_km=42.2, is_finish=True, order=5),
        ]
        plan.append((em, dists, 150))

        # ---- generate orders (in memory) ----
        order_objs, order_lines = [], []
        for event, tts, n in plan:
            for _ in range(n):
                method = rng.choice(PAY)
                currency = "USD" if method == PaymentMethod.CARD else rng.choice(["USD", "USD", "ZIG"])
                rate = float(event.zig_per_usd) if currency == "ZIG" else 1.0
                buyer = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
                lines = []
                for t in rng.sample(tts, k=rng.randint(1, min(2, len(tts)))):
                    for _ in range(rng.randint(1, 3)):
                        lines.append(t)
                if not lines:
                    continue
                total = sum(float(t.price_usd) for t in lines) * rate
                order_objs.append(Order(
                    event=event, buyer_name=buyer,
                    buyer_email=f"{buyer.split()[0].lower()}@example.com",
                    buyer_phone=f"+2637{rng.randint(10000000, 99999999)}",
                    status=Order.Status.PAID, payment_method=method,
                    currency=currency, total=round(total, 2)))
                order_lines.append(lines)
        Order.objects.bulk_create(order_objs, batch_size=500)

        # ---- tickets (bibs computed in Python) ----
        bib_ctr = {d.id: (d.sort + 1) * 1000 for d in dists}
        marathon_tt = {d.id for d in dists}
        ticket_objs, ticket_km = [], []
        for order, lines in zip(order_objs, order_lines):
            for t in lines:
                tk = Ticket(order=order, ticket_type=t, holder_name=order.buyer_name)
                if t.id in marathon_tt:
                    bib_ctr[t.id] += 1
                    tk.bib_number = bib_ctr[t.id]
                    tk.chip_id = "CHIP-%06X" % rng.randrange(16**6)
                ticket_objs.append(tk)
                ticket_km.append(t)
        Ticket.objects.bulk_create(ticket_objs, batch_size=500)

        # ---- marathon results + splits (ranks computed before insert) ----
        finishers = {d.id: [] for d in dists}   # tt_id -> [(chip, result_obj)]
        results, split_objs = [], []
        for tk, t in zip(ticket_objs, ticket_km):
            if t.id not in marathon_tt:
                continue
            roll = rng.random()
            if roll < 0.05:
                results.append(RaceResult(ticket=tk, status=RaceResult.Status.DNS)); continue
            if roll < 0.10:
                results.append(RaceResult(ticket=tk, status=RaceResult.Status.DNF)); continue
            chip = int(BASE_TIME[t.name] * rng.uniform(1.0, 1.9))
            r = RaceResult(ticket=tk, status=RaceResult.Status.FINISHED,
                           chip_seconds=chip, gun_seconds=chip + rng.randint(20, 240))
            results.append(r)
            finishers[t.id].append((chip, r))
            start = now - dt.timedelta(seconds=chip + 600)
            km = float(t.distance_km or 0)
            for c in cps:
                if float(c.distance_km) <= km + 0.1:
                    frac = (float(c.distance_km) / km) if km else 0
                    split_objs.append(SplitTime(ticket=tk, checkpoint=c,
                        recorded_at=start + dt.timedelta(seconds=int(chip * frac))))
        for lst in finishers.values():
            for rank, (_, r) in enumerate(sorted(lst, key=lambda x: x[0]), start=1):
                r.overall_rank = rank
        RaceResult.objects.bulk_create(results, batch_size=500)
        SplitTime.objects.bulk_create(split_objs, batch_size=1000)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Event.objects.count()} events, {len(order_objs)} orders, "
            f"{len(ticket_objs)} tickets, {len(split_objs)} splits."))
