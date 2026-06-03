import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Storefront, Plus, Trash, ChartBar, Ticket as TicketIcon, ArrowRight, Image,
} from "@phosphor-icons/react";
import { api, money, fmtDate } from "../api";
import { useAuth, GoogleButton } from "../auth.jsx";
import { Empty, CategoryIcon } from "../components/ui.jsx";
import { OrganizerListSkeleton, OrganizerCardsSkeleton } from "../components/skeletons.jsx";

const CATEGORIES = [
  ["MUSIC", "Music & Concerts"], ["SPORT", "Sports"],
  ["MARATHON", "Marathon & Running"], ["CONFERENCE", "Conference"],
  ["THEATRE", "Theatre & Arts"], ["FESTIVAL", "Festival"],
  ["COMEDY", "Comedy"], ["WORKSHOP", "Workshop"], ["OTHER", "Other"],
];
// Used only to give a new event a banner glyph (the event-detail banner keeps emoji).
const EMOJI = { MUSIC: "🎵", SPORT: "⚽", MARATHON: "🏃", CONFERENCE: "🎤", THEATRE: "🎭", FESTIVAL: "🎪", COMEDY: "😂", WORKSHOP: "🛠️", OTHER: "🎟️" };

export default function Organizer() {
  const { user, ready } = useAuth();
  const [events, setEvents] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = () => api.organizerEvents().then(setEvents).catch(() => setEvents([]));
  useEffect(() => { if (user) load(); }, [user]);

  if (!ready) return <OrganizerListSkeleton />;
  if (!user) {
    return (
      <div className="container section center stack" style={{ maxWidth: 460, "--gap": "16px" }}>
        <img src="/t-logo.png" alt="Ticketboy" style={{ width: 190, margin: "0 auto" }} />
        <h2 className="serif">Sell tickets to your event</h2>
        <p className="muted">Sign in to create events, set ticket prices, and track sales in real time.</p>
        <div className="row" style={{ justifyContent: "center" }}><GoogleButton /></div>
      </div>
    );
  }

  return (
    <div className="container section stack fade-in" style={{ "--gap": "20px" }}>
      <div className="page-head">
        <div>
          <span className="eyebrow"><Storefront weight="fill" /> Organizer</span>
          <h1>Your events</h1>
        </div>
        {!creating && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus weight="bold" /> Create event
          </button>
        )}
      </div>

      {creating && <CreateForm onDone={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}

      {!events && <OrganizerCardsSkeleton />}
      {events && events.length === 0 && !creating && (
        <Empty>No events yet. Click <strong>Create event</strong> to get started.</Empty>
      )}
      {events && events.length > 0 && (
        <div className="ev-grid">
          {events.map((e) => (
            <div key={e.slug} className="card card-p stack" style={{ "--gap": "10px" }}>
              <div className="spread">
                <span className="chip"><CategoryIcon category={e.category} size={13} weight="fill" /> {e.category}</span>
                {!e.published && <span className="chip gold">Draft</span>}
              </div>
              <h3 className="clamp-2">{e.title}</h3>
              <div className="muted truncate" style={{ fontSize: ".85rem" }}>{fmtDate(e.starts_at)} · {e.city}</div>
              <div className="row wrap" style={{ gap: 8 }}>
                <span className="chip green"><TicketIcon size={13} weight="fill" /> {e.sold} sold</span>
                <span className="chip">{e.ticket_types.length} ticket types</span>
              </div>
              <div className="divider" />
              <div className="row" style={{ gap: 8 }}>
                <Link to={`/organize/${e.slug}`} className="btn btn-primary btn-sm grow"><ChartBar weight="fill" /> Dashboard</Link>
                <Link to={`/e/${e.slug}`} className="btn btn-ghost btn-sm">View <ArrowRight weight="bold" /></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateForm({ onDone, onCancel }) {
  const [f, setF] = useState({
    title: "", category: "MUSIC", tagline: "", description: "",
    venue: "", city: "Harare", starts_at: "", cover_emoji: "🎵",
  });
  const [tts, setTts] = useState([{ name: "General Admission", price_usd: "10", capacity: "200", description: "" }]);
  const [cover, setCover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setF((o) => ({ ...o, [k]: v, ...(k === "category" ? { cover_emoji: EMOJI[v] } : {}) }));
  const isMarathon = f.category === "MARATHON";

  const setTt = (i, k, v) => setTts((a) => a.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  const addTt = () => setTts((a) => [...a, { name: "", price_usd: "", capacity: "100", description: "" }]);
  const rmTt = (i) => setTts((a) => a.filter((_, j) => j !== i));

  async function submit() {
    setBusy(true); setError("");
    try {
      const payload = {
        ...f,
        starts_at: new Date(f.starts_at).toISOString(),
        ticket_types: tts.map((t, i) => ({
          name: t.name, description: t.description,
          price_usd: Number(t.price_usd) || 0, capacity: Number(t.capacity) || 0,
          distance_km: isMarathon && t.distance_km ? Number(t.distance_km) : null,
          sort: i,
        })),
      };
      const ev = await api.createEvent(payload);
      if (cover) { try { await api.uploadCover(ev.slug, cover); } catch { /* non-fatal */ } }
      onDone();
    } catch (e) { setError(e.message); setBusy(false); }
  }

  const valid = f.title.trim() && f.starts_at && tts.every((t) => t.name && t.price_usd !== "");

  return (
    <div className="card card-p stack fade-in" style={{ "--gap": "16px" }}>
      <h3>New event</h3>
      <div className="field">
        <label>Event title *</label>
        <input className="input" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Jazz Night at the Gardens" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Category</label>
          <select className="select" value={f.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Date &amp; time *</label>
          <input className="input" type="datetime-local" value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
        </div>
      </div>
      <div className="grid-2">
        <div className="field"><label>Venue</label><input className="input" value={f.venue} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. HICC" /></div>
        <div className="field"><label>City</label><input className="input" value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
      </div>
      <div className="field">
        <label>Tagline</label>
        <input className="input" value={f.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="One catchy line" />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea className="input" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="field">
        <label className="row" style={{ gap: 6 }}><Image weight="fill" /> Cover image (optional)</label>
        <input className="input" type="file" accept="image/*" onChange={(e) => setCover(e.target.files[0])} />
      </div>

      <div className="divider" />
      <div className="spread"><h3>{isMarathon ? "Distances" : "Ticket types"}</h3>
        <button className="btn btn-ghost btn-sm" onClick={addTt}><Plus weight="bold" /> Add</button></div>
      {tts.map((t, i) => (
        <div key={i} className="card card-p stack" style={{ "--gap": "10px", background: "var(--paper)" }}>
          <div className="grid-2">
            <div className="field"><label>Name *</label><input className="input" value={t.name} onChange={(e) => setTt(i, "name", e.target.value)} placeholder={isMarathon ? "Full Marathon" : "VIP"} /></div>
            <div className="field"><label>Price (USD) *</label><input className="input" type="number" min="0" value={t.price_usd} onChange={(e) => setTt(i, "price_usd", e.target.value)} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Capacity</label><input className="input" type="number" min="1" value={t.capacity} onChange={(e) => setTt(i, "capacity", e.target.value)} /></div>
            {isMarathon
              ? <div className="field"><label>Distance (km)</label><input className="input" type="number" step="0.1" value={t.distance_km || ""} onChange={(e) => setTt(i, "distance_km", e.target.value)} /></div>
              : <div className="field"><label>Note</label><input className="input" value={t.description} onChange={(e) => setTt(i, "description", e.target.value)} placeholder="Optional" /></div>}
          </div>
          {tts.length > 1 && <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start", color: "var(--clay)" }} onClick={() => rmTt(i)}><Trash /> Remove</button>}
        </div>
      ))}

      {error && <div className="chip red" style={{ width: "100%" }}>{error}</div>}
      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-gold grow" disabled={!valid || busy} onClick={submit}>
          {busy ? "Publishing…" : "Publish event"}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
