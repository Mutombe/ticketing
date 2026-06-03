"""
Give the seeded events real cover photos (stored in DigitalOcean Spaces).

    python manage.py setcovers

Tries a curated Unsplash photo first (best quality), then a themed LoremFlickr
image, then Picsum as a guaranteed fallback — so every event ends up with a
real photograph that blends into the cards and hero.
"""
import requests
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from events.models import Event

UA = {"User-Agent": "Mozilla/5.0 (Ticketboy seed)"}

# slug -> ordered list of candidate image URLs (first that returns a real image wins)
COVERS = {
    "winky-d-eureka-live": [
        "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1280&q=80",
        "https://loremflickr.com/1280/800/concert,stage,lights?lock=11",
        "https://picsum.photos/seed/tb-concert/1280/800",
    ],
    "dynamos-vs-highlanders-2026": [
        "https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?auto=format&fit=crop&w=1280&q=80",
        "https://loremflickr.com/1280/800/soccer,stadium,football?lock=12",
        "https://picsum.photos/seed/tb-football/1280/800",
    ],
    "zim-tech-summit-2026": [
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1280&q=80",
        "https://loremflickr.com/1280/800/conference,technology,audience?lock=13",
        "https://picsum.photos/seed/tb-conf/1280/800",
    ],
    "long-john-live-comedy": [
        "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1280&q=80",
        "https://loremflickr.com/1280/800/comedy,microphone,stage?lock=14",
        "https://picsum.photos/seed/tb-comedy/1280/800",
    ],
    "victoria-falls-carnival-2026": [
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80",
        "https://loremflickr.com/1280/800/festival,music,crowd?lock=15",
        "https://picsum.photos/seed/tb-festival/1280/800",
    ],
    "victoria-falls-marathon-2026": [
        "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1280&q=80",
        "https://loremflickr.com/1280/800/marathon,running,runners?lock=16",
        "https://picsum.photos/seed/tb-marathon/1280/800",
    ],
}


class Command(BaseCommand):
    help = "Attach real cover photos to seeded events."

    def handle(self, *args, **opts):
        for slug, urls in COVERS.items():
            try:
                ev = Event.objects.get(slug=slug)
            except Event.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"skip {slug} (not found)"))
                continue
            ok = False
            for url in urls:
                try:
                    r = requests.get(url, headers=UA, timeout=25)
                    ct = r.headers.get("content-type", "")
                    if r.status_code == 200 and ct.startswith("image") and len(r.content) > 5000:
                        ev.cover_image.save(f"{slug}.jpg", ContentFile(r.content), save=True)
                        ok = True
                        self.stdout.write(self.style.SUCCESS(
                            f"OK   {slug} <- {url.split('//')[1].split('/')[0]} ({len(r.content)//1024} KB)"))
                        break
                except Exception as exc:
                    self.stdout.write(f"  --  {slug} failed {url[:48]} : {exc}")
            if not ok:
                self.stdout.write(self.style.ERROR(f"FAIL {slug}: no image could be fetched"))

        self.stdout.write(self.style.SUCCESS("Done. Cover URLs now point at DigitalOcean Spaces."))
