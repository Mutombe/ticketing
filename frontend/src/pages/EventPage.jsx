import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Minus, Plus, CalendarBlank, MapPin, Clock, Trophy, ArrowRight, Info, WhatsappLogo,
} from "@phosphor-icons/react";
import { api, money, fmtDate, fmtTime, waShare, eventUrl } from "../api";
import { useCached } from "../useCached";
import { Cover, Accordion } from "../components/ui.jsx";
import { EventDetailSkeleton } from "../components/skeletons.jsx";

export default function EventPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: ev, error } = useCached(`event:${slug}`, () => api.event(slug));
  const [qty, setQty] = useState({}); // ticketTypeId -> count

  const total = useMemo(() => {
    if (!ev) return 0;
    return ev.ticket_types.reduce(
      (sum, t) => sum + (qty[t.id] || 0) * Number(t.price_usd), 0);
  }, [qty, ev]);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);

  if (error) return <div className="container section">Event not found.</div>;
  if (!ev) return <EventDetailSkeleton />;

  const setQ = (id, v, max) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(v, max)) }));

  const goCheckout = () => {
    const items = ev.ticket_types
      .filter((t) => qty[t.id] > 0)
      .map((t) => ({ ticket_type: t.id, name: t.name, price_usd: Number(t.price_usd), quantity: qty[t.id] }));
    navigate(`/e/${slug}/checkout`, { state: { items, event: { title: ev.title, slug: ev.slug, zig_per_usd: ev.zig_per_usd } } });
  };

  return (
    <div className="container section stack fade-in" style={{ "--gap": "24px" }}>
      <Cover event={ev} hero />

      <div className="grid-cols">
        {/* Left: details */}
        <div className="stack" style={{ "--gap": "20px" }}>
          <div className="card card-p">
            <div className="info-list">
              <InfoRow icon={<CalendarBlank weight="fill" size={20} />} label="Date"
                value={fmtDate(ev.starts_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
              <InfoRow icon={<Clock weight="fill" size={20} />} label="Time" value={fmtTime(ev.starts_at)} />
              <InfoRow icon={<MapPin weight="fill" size={20} />} label="Venue" value={`${ev.venue}, ${ev.city}`} />
            </div>
          </div>

          <Accordion title="About this event" icon={<Info weight="fill" color="var(--green-600)" />}>
            {ev.tagline && <p style={{ fontWeight: 600, marginBottom: 8 }}>{ev.tagline}</p>}
            <p className="muted">{ev.description}</p>
          </Accordion>

          <a className="btn btn-ghost btn-block" target="_blank" rel="noreferrer"
            href={waShare(`Get tickets for ${ev.title} on Ticketboy: ${eventUrl(slug)}`)}>
            <WhatsappLogo weight="fill" color="#25D366" /> Share on WhatsApp
          </a>

          {ev.is_marathon && (
            <Link to={`/e/${slug}/results`} className="card card-p spread card-hover" style={{ textDecoration: "none" }}>
              <span className="row"><Trophy weight="fill" color="var(--brass)" /> <strong>Live results &amp; leaderboard</strong></span>
              <ArrowRight weight="bold" />
            </Link>
          )}
        </div>

        {/* Right: ticket picker */}
        <div className="summary">
          <div className="card card-p stack">
            <h3>{ev.is_marathon ? "Choose your distance" : "Tickets"}</h3>
            {ev.ticket_types.map((t) => {
              const n = qty[t.id] || 0;
              const max = Math.min(t.remaining, t.max_per_order);
              const soldOut = t.remaining <= 0;
              return (
                <div key={t.id} className={`tt-row ${n > 0 ? "picked" : ""}`}>
                  <div className="tt-info">
                    <div className="name">{t.name}</div>
                    {t.description && <div className="desc">{t.description}</div>}
                    <div className="avail">
                      {soldOut ? "Sold out" : `${t.remaining} left`} · ≈ {money(t.price_zig, "ZIG")}
                    </div>
                  </div>
                  <div className="tt-right">
                    <span className="tt-price">{money(t.price_usd)}</span>
                    {soldOut ? (
                      <span className="chip red">Sold out</span>
                    ) : (
                      <div className="qty">
                        <button disabled={n <= 0} onClick={() => setQ(t.id, n - 1, max)}><Minus size={15} weight="bold" /></button>
                        <span className="n">{n}</span>
                        <button disabled={n >= max} onClick={() => setQ(t.id, n + 1, max)}><Plus size={15} weight="bold" /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="divider" />
            <div className="spread">
              <span className="muted">{count} {count === 1 ? "ticket" : "tickets"}</span>
              <strong style={{ fontSize: "1.35rem", fontFamily: "var(--serif)" }}>{money(total)}</strong>
            </div>
            <button className="btn btn-gold btn-lg btn-block" disabled={count === 0} onClick={goCheckout}>
              {count === 0 ? "Select tickets" : <>Checkout <ArrowRight weight="bold" /></>}
            </button>
            <p className="row muted center" style={{ fontSize: ".78rem", justifyContent: "center" }}>
              <Info size={14} /> Pay in USD or ZiG at checkout
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="info-row">
      <span className="ic">{icon}</span>
      <div>
        <div className="k">{label}</div>
        <div className="v">{value}</div>
      </div>
    </div>
  );
}
