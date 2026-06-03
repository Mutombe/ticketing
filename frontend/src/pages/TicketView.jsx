import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle, MapPin, Timer, Medal, Path, ArrowRight, CalendarPlus,
  WhatsappLogo, FilePdf, ImageSquare,
} from "@phosphor-icons/react";
import { api, fmtDate, fmtTime, googleCalUrl, waShare, ticketUrl } from "../api";
import { CategoryIcon } from "../components/ui.jsx";
import { TicketSkeleton } from "../components/skeletons.jsx";

export default function TicketView() {
  const { qr } = useParams();
  const [t, setT] = useState(null);
  const [busy, setBusy] = useState("");
  const ref = useRef(null);

  useEffect(() => { api.ticket({ qr }).then(setT).catch(() => setT(false)); }, [qr]);

  // Measure the tear line and cut the mask notches exactly there.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !t) return;
    const place = () => {
      const perf = el.querySelector(".perf");
      if (!perf) return;
      const y = perf.getBoundingClientRect().top - el.getBoundingClientRect().top;
      el.style.setProperty("--perf-y", `${Math.round(y)}px`);
    };
    place();
    const id = requestAnimationFrame(place);              // re-measure after fonts settle
    window.addEventListener("resize", place);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", place); };
  }, [t]);

  async function download(kind) {
    const el = ref.current;
    if (!el) return;
    setBusy(kind);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const bibRect = el.getBoundingClientRect();
      const perfY = el.querySelector(".perf").getBoundingClientRect().top - bibRect.top;
      // html2canvas can't render CSS masks → capture unmasked, then punch notches on the canvas
      const canvas = await html2canvas(el, {
        scale: 2, backgroundColor: "#F5F8FD", useCORS: true, logging: false,
        onclone: (_doc, clone) => { clone.style.mask = "none"; clone.style.webkitMask = "none"; },
      });
      const ctx = canvas.getContext("2d");
      const sx = canvas.width / bibRect.width, sy = canvas.height / bibRect.height;
      ctx.fillStyle = "#F5F8FD";  // paper = the export background, so notches read as cuts
      for (const cx of [0, canvas.width]) {
        ctx.beginPath(); ctx.arc(cx, perfY * sy, 11 * sx, 0, Math.PI * 2); ctx.fill();
      }
      const name = `ticketboy-${t.order_reference}`;
      if (kind === "png") {
        const a = document.createElement("a");
        a.download = `${name}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const img = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "px",
          format: [canvas.width, canvas.height] });
        pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`${name}.pdf`);
      }
    } catch (e) { console.error(e); }
    setBusy("");
  }

  if (t === false) return <div className="container section">Ticket not found.</div>;
  if (!t) return <TicketSkeleton />;

  const checked = t.status === "CHECKED_IN";
  const result = t.result;

  return (
    <div className="container section fade-in" style={{ maxWidth: 520 }}>
      {/* The ticket (this exact element is what downloads) */}
      <div className="bib-wrap">
      <div className="bib" ref={ref}>
        <div className="bib-top">
          <img src="/t-favicon.png" alt="" className="bib-mark" aria-hidden="true" />
          <div className="spread" style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#fff", letterSpacing: "-.02em" }}>
              Ticket<span style={{ color: "var(--brass-bright)" }}>boy</span>
            </span>
            <span className={`chip ${checked ? "green" : "gold"}`}>
              {checked ? <><CheckCircle weight="fill" size={13} /> Checked in</> : "Valid"}
            </span>
          </div>
          <span className="eyebrow" style={{ color: "var(--brass-bright)" }}>
            <CategoryIcon category={t.event_category} size={14} weight="fill" /> {t.ticket_type_name}
          </span>
          {t.bib_number
            ? <div className="bib-number">{t.bib_number}</div>
            : <h2 className="clamp-2" style={{ color: "#fff", fontSize: "1.55rem", marginTop: 4 }}>{t.event_title}</h2>}
          <strong style={{ color: "#fff" }}>{t.holder_name}</strong>
        </div>

        <div className="perf" />

        <div className="bib-body">
          <div className="bib-grid">
            <div className="stack" style={{ "--gap": "13px", flex: 1, minWidth: 0 }}>
              {t.bib_number && <Field label="Event" value={t.event_title} />}
              <Field label="When" value={`${fmtDate(t.event_starts_at)} · ${fmtTime(t.event_starts_at)}`} />
              <Field label="Where" value={`${t.event_venue}, ${t.event_city}`} />
              <Field label="Order" value={t.order_reference} />
            </div>
            <div className="bib-qr">
              <div className="qr-wrap">
                <QRCodeSVG value={`TICKETBOY:${t.qr_token}`} size={124} fgColor="#001850" level="M" />
              </div>
              <span className="muted" style={{ fontSize: ".72rem" }}>Scan at the gate</span>
            </div>
          </div>
        </div>

        <div className="bib-foot">ticketboy.co.zw</div>
      </div>
      </div>

      {/* Actions (not part of the download) */}
      <div className="stack" style={{ marginTop: 16, "--gap": "10px" }}>
        <div className="grid-2" style={{ gap: 10 }}>
          <button className="btn btn-primary" disabled={!!busy} onClick={() => download("pdf")}>
            <FilePdf weight="fill" /> {busy === "pdf" ? "Preparing…" : "Download PDF"}
          </button>
          <button className="btn btn-ghost" disabled={!!busy} onClick={() => download("png")}>
            <ImageSquare weight="fill" /> {busy === "png" ? "Preparing…" : "Download image"}
          </button>
        </div>
        <div className="grid-2" style={{ gap: 10 }}>
          <a className="btn btn-ghost" target="_blank" rel="noreferrer"
            href={googleCalUrl({ title: t.event_title, start: t.event_starts_at,
              location: `${t.event_venue}, ${t.event_city}`,
              details: `Your Ticketboy ticket: ${ticketUrl(t.qr_token)}` })}>
            <CalendarPlus weight="fill" /> Add to calendar
          </a>
          <a className="btn btn-ghost" target="_blank" rel="noreferrer"
            href={waShare(`My ticket for ${t.event_title}: ${ticketUrl(t.qr_token)}`)}>
            <WhatsappLogo weight="fill" color="#25D366" /> WhatsApp
          </a>
        </div>
      </div>

      {/* Marathon: splits + result */}
      {t.splits?.length > 0 && (
        <div className="card card-p stack" style={{ marginTop: 18 }}>
          <h3 className="row"><Path weight="fill" /> Race progress</h3>
          <div className="timeline">
            {t.splits.map((s, i) => (
              <div key={s.id} className={`tl-item ${i === t.splits.length - 1 ? "live" : "done"}`}>
                <div className="spread">
                  <strong className="row" style={{ gap: 6 }}>
                    <MapPin size={15} /> {s.checkpoint_name}
                    <span className="muted" style={{ fontWeight: 400 }}>· {s.distance_km} km</span>
                  </strong>
                  <span className="muted" style={{ fontSize: ".85rem" }}>{fmtTime(s.recorded_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.status === "FINISHED" && (
        <div className="card card-p stack" style={{ marginTop: 18 }}>
          <h3 className="row"><Medal weight="fill" color="var(--brass)" /> Result</h3>
          <div className="stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="stat">
              <div className="k row" style={{ gap: 5 }}><Timer size={14} /> Chip time</div>
              <div className="v">{result.chip_time}</div>
            </div>
            <div className="stat">
              <div className="k">Gun time</div>
              <div className="v">{result.gun_time}</div>
            </div>
          </div>
          <div className="spread">
            <span className="chip gold">Position #{result.overall_rank} · {t.ticket_type_name}</span>
            <Link to={`/e/${t.event_slug}/results`} className="row" style={{ fontSize: ".88rem", color: "var(--green-700)" }}>
              Leaderboard <ArrowRight weight="bold" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: ".7rem", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <strong style={{ fontSize: ".92rem" }}>{value}</strong>
    </div>
  );
}
