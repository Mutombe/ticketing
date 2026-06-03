import { useEffect, useRef, useState } from "react";
import {
  MusicNotes, SoccerBall, PersonSimpleRun, Presentation, MaskHappy,
  Confetti, Microphone, Toolbox, Ticket, CaretDown,
} from "@phosphor-icons/react";
import { CATEGORY_GRADIENT } from "../api";

const CATEGORY_ICON = {
  MUSIC: MusicNotes, SPORT: SoccerBall, MARATHON: PersonSimpleRun,
  CONFERENCE: Presentation, THEATRE: MaskHappy, FESTIVAL: Confetti,
  COMEDY: Microphone, WORKSHOP: Toolbox, OTHER: Ticket,
};

export function CategoryIcon({ category, ...props }) {
  const Icon = CATEGORY_ICON[category] || Ticket;
  return <Icon {...props} />;
}

export function Cover({ event, hero = false }) {
  const grad = CATEGORY_GRADIENT[event.category] || CATEGORY_GRADIENT.OTHER;
  // The event-detail banner keeps its emoji treatment (looks great); cards use icons.
  if (hero) {
    return (
      <div className="hero-cover" style={{ background: grad }}>
        {event.cover ? <img src={event.cover} alt="" /> : <span className="emoji-bg">{event.cover_emoji}</span>}
        <div className="veil" />
        <div className="inner stack" style={{ "--gap": "10px" }}>{heroChildren(event)}</div>
      </div>
    );
  }
  const d = new Date(event.starts_at);
  return (
    <div className="ev-cover" style={{ background: grad }}>
      {event.cover
        ? <img src={event.cover} alt="" />
        : <CategoryIcon category={event.category} size={54} weight="fill" color="#fff" style={{ opacity: .92 }} />}
      <span className="cat-tag">{event.category_label || event.category}</span>
      <div className="date-tag">
        <div className="d">{d.getDate()}</div>
        <div className="m">{d.toLocaleDateString("en-GB", { month: "short" })}</div>
      </div>
    </div>
  );
}

function heroChildren(event) {
  // Banner = identity only (category + title). Everything else lives below.
  return (
    <>
      <span className="chip" style={{ background: "rgba(255,255,255,.16)", color: "#fff", border: "none" }}>
        {event.cover_emoji} {event.category_label}
      </span>
      <h1 className="clamp-2">{event.title}</h1>
    </>
  );
}

/* Tap-to-open disclosure — keeps secondary detail out of the way. */
export function Accordion({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button className="acc-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="row" style={{ gap: 10 }}>{icon}<strong>{title}</strong></span>
        <CaretDown size={18} weight="bold"
          style={{ color: "var(--muted)", transform: open ? "rotate(180deg)" : "none", transition: ".18s" }} />
      </button>
      {open && <div className="acc-body fade-in">{children}</div>}
    </div>
  );
}

/* Collapsible long text — keeps banners/cards lean, expands on demand. */
export function ReadMore({ children, lines = 4 }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 2);
  }, [children]);
  return (
    <div>
      <p ref={ref} className={expanded ? "" : `clamp-${lines}`} style={{ color: "var(--muted)" }}>
        {children}
      </p>
      {(overflowing || expanded) && (
        <button className="link-btn" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : "Read more"}
          <CaretDown size={13} weight="bold" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: ".15s" }} />
        </button>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="card card-p center muted" style={{ padding: 40 }}>{children}</div>;
}
