import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MagnifyingGlass, MapPin, ArrowRight } from "@phosphor-icons/react";
import { api, money, fmtDate, CATEGORY_TINT } from "../api";
import { useCached } from "../useCached";
import { Cover, Empty, CategoryIcon } from "../components/ui.jsx";
import { EventGridSkeleton } from "../components/skeletons.jsx";

// Average the image's bottom edge, lightened — the colour it bleeds into the card.
function sampleTint(img) {
  try {
    const w = 18, h = 18;
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const rows = 5;
    const d = ctx.getImageData(0, h - rows, w, rows).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    const k = 0.18;
    const lift = (c) => Math.round((c / n) * k + 255 * (1 - k));
    return `rgb(${lift(r)}, ${lift(g)}, ${lift(b)})`;
  } catch { return null; }
}

// Content-aware tint: theme colour by default, upgraded to the real image colour
// once the image can be read cross-origin (Spaces CORS enabled).
function useCoverTint(cover, category) {
  const [tint, setTint] = useState(CATEGORY_TINT[category] || CATEGORY_TINT.OTHER);
  useEffect(() => {
    setTint(CATEGORY_TINT[category] || CATEGORY_TINT.OTHER);
    if (!cover) return;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => { const t = sampleTint(im); if (t) setTint(t); };
    im.onerror = () => {};
    im.src = cover;
    return () => { im.onload = im.onerror = null; };
  }, [cover, category]);
  return tint;
}

export default function Home() {
  const [active, setActive] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");            // debounced search term

  useEffect(() => {
    const id = setTimeout(() => setDq(q.trim()), q ? 250 : 0);
    return () => clearTimeout(id);
  }, [q]);

  const { data: cats } = useCached("categories", () => api.categories());
  const { data: events } = useCached(
    `events:${active}:${dq}`, () => api.events({ category: active, q: dq })
  );

  const categories = cats || [];
  const featured = (events?.filter((e) => e.featured) || []).slice(0, 3);

  return (
    <div className="container section stack" style={{ "--gap": "26px" }}>
      <section className="hero">
        <img src="/t-favicon.png" alt="" className="hero-mark" aria-hidden="true" />
        <div className="stack hero-content" style={{ "--gap": "16px" }}>
          <span className="eyebrow" style={{ color: "var(--brass-bright)" }}>
            Zimbabwe · live events
          </span>
          <h1>What&apos;s on, near you.</h1>
          <p>Concerts, sport, festivals and more. Buy your ticket right on your phone.</p>
          <div className="hero-search">
            <MagnifyingGlass size={21} color="var(--muted)" weight="bold" />
            <input className="grow" placeholder="Search events or venues"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </section>

      <div className="cat-bar">
        <button className={`cat-chip ${!active ? "active" : ""}`} onClick={() => setActive("")}>
          All events
        </button>
        {categories.filter((c) => c.count > 0).map((c) => (
          <button key={c.value} className={`cat-chip ${active === c.value ? "active" : ""}`}
            onClick={() => setActive(active === c.value ? "" : c.value)}>
            <CategoryIcon category={c.value} size={16} weight="fill" /> {c.label} <span className="n">{c.count}</span>
          </button>
        ))}
      </div>

      {!events && (
        <section className="stack">
          <h2 className="serif">Events</h2>
          <EventGridSkeleton />
        </section>
      )}

      {events && featured.length > 0 && !active && !q && (
        <section className="stack">
          <h2 className="serif">Featured</h2>
          <div className="ev-grid">
            {featured.map((e) => <EventCard key={e.slug} e={e} />)}
          </div>
        </section>
      )}

      {events && (
        <section className="stack">
          <h2 className="serif">{active || q ? "Results" : "All events"}</h2>
          {events.length === 0 ? (
            <Empty>No events match. Try another search.</Empty>
          ) : (
            <div className="ev-grid">
              {events.map((e) => <EventCard key={e.slug} e={e} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function EventCard({ e }) {
  const tint = useCoverTint(e.cover, e.category);
  return (
    <Link to={`/e/${e.slug}`} className="ev-card card-hover" style={{ "--tint": tint }}>
      <Cover event={e} />
      <div className="body stack" style={{ "--gap": "7px" }}>
        <h3 className="clamp-2" style={{ minHeight: "2.3em" }}>{e.title}</h3>
        <div className="row muted truncate" style={{ fontSize: ".88rem", gap: 6 }}>
          <MapPin size={15} weight="fill" /> {e.city} · {fmtDate(e.starts_at, { day: "numeric", month: "short" })}
        </div>
        <div className="spread" style={{ marginTop: 6 }}>
          <span>
            <span className="muted" style={{ fontSize: ".78rem" }}>From </span>
            <strong style={{ fontSize: "1.05rem" }}>{money(e.min_price)}</strong>
          </span>
          <span className="row" style={{ color: "var(--green-600)", fontWeight: 600, fontSize: ".9rem", gap: 5 }}>
            Get tickets <ArrowRight weight="bold" />
          </span>
        </div>
      </div>
    </Link>
  );
}
