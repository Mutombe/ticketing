import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Ticket as TicketIcon, IdentificationCard, Receipt, CurrencyDollar,
  ArrowLeft, QrCode, CheckCircle, XCircle,
} from "@phosphor-icons/react";
import { api, money, fmtTime, PAYMENTS } from "../api";
import { useAuth } from "../auth.jsx";
import { DashboardSkeleton } from "../components/skeletons.jsx";

export default function OrganizerDashboard() {
  const { slug } = useParams();
  const { user, ready } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");

  const load = () => api.organizerDashboard(slug).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { if (user) load(); const t = setInterval(() => user && load(), 10000); return () => clearInterval(t); }, [user, slug]);

  if (!ready) return <DashboardSkeleton />;
  if (!user) return <div className="container section">Please sign in.</div>;
  if (err) return <div className="container section"><div className="chip red">{err}</div></div>;
  if (!d) return <DashboardSkeleton />;

  const totalPay = Object.values(d.payment_mix).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="container section stack fade-in" style={{ "--gap": "20px" }}>
      <Link to="/organize" className="row muted" style={{ fontSize: ".9rem" }}><ArrowLeft /> All events</Link>
      <div className="spread">
        <div><span className="eyebrow">Dashboard</span><h1 className="serif">{d.event.title}</h1></div>
        <span className="chip green">● Live</span>
      </div>

      <div className="stats">
        <Stat icon={<TicketIcon weight="fill" />} v={d.tickets_sold} k="Tickets sold" />
        <Stat icon={<Receipt weight="fill" />} v={d.orders} k="Orders" />
        <Stat icon={<IdentificationCard weight="fill" />} v={d.checked_in} k="Checked in" />
        <Stat icon={<CurrencyDollar weight="fill" />} v={money(d.revenue.USD, "USD")} k={`+ ${money(d.revenue.ZIG, "ZIG")}`} />
      </div>

      <CheckIn slug={slug} onChecked={load} />

      <div className="grid-2">
        <div className="card card-p stack">
          <h3>Sales by ticket type</h3>
          {d.by_type.map((t) => (
            <div key={t.name} className="stack" style={{ "--gap": "6px" }}>
              <div className="spread">
                <strong>{t.name}</strong>
                <span className="muted" style={{ fontSize: ".85rem" }}>{t.sold}/{t.capacity} · {money(t.revenue_usd)}</span>
              </div>
              <div className={`bar ${t.pct >= 90 ? "warn" : ""}`}><span style={{ width: `${t.pct}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="card card-p stack">
          <h3>Payment mix</h3>
          {Object.entries(d.payment_mix).sort((a, b) => b[1] - a[1]).map(([m, n]) => {
            const p = PAYMENTS[m] || { label: m, color: "#999", short: "?" };
            return (
              <div key={m} className="stack" style={{ "--gap": "6px" }}>
                <div className="spread">
                  <span className="row" style={{ gap: 8 }}>
                    <span className="logo" style={{ background: p.color, width: 24, height: 24, fontSize: ".65rem" }}>{p.short}</span>
                    {p.label}
                  </span>
                  <span className="muted">{Math.round((n / totalPay) * 100)}%</span>
                </div>
                <div className="bar"><span style={{ width: `${(n / totalPay) * 100}%`, background: p.color }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card card-p stack">
        <h3>Recent orders</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Ref</th><th>Buyer</th><th>Tickets</th><th>Paid</th><th className="hide-mobile">Time</th></tr></thead>
            <tbody>
              {d.recent_orders.map((o) => (
                <tr key={o.reference}>
                  <td className="muted">{o.reference}</td>
                  <td><strong>{o.buyer_name}</strong></td>
                  <td>{o.count}</td>
                  <td>{money(o.total, o.currency)}</td>
                  <td className="hide-mobile muted">{fmtTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CheckIn({ slug, onChecked }) {
  const [code, setCode] = useState("");
  const [last, setLast] = useState(null);

  async function go(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setLast(null);
    try {
      // accept "TICKETBOY:<qr>" or raw qr or bib number
      let qr = code.trim().replace(/^TICKETBOY:/, "");
      let t;
      if (/^\d+$/.test(qr)) t = await api.ticket({ bib: qr });
      else t = await api.ticket({ qr });
      if (t.event_slug !== slug) { setLast({ ok: false, msg: "Ticket is for a different event." }); return; }
      const res = await api.checkIn(t.qr_token);
      const tk = res.ticket || res;
      setLast({ ok: true, msg: `${tk.holder_name} · ${tk.ticket_type_name}${tk.bib_number ? ` · #${tk.bib_number}` : ""}`,
                already: !!res.detail });
      onChecked?.();
    } catch (err) { setLast({ ok: false, msg: err.message }); }
    setCode("");
  }

  return (
    <div className="card card-p stack">
      <h3 className="row"><QrCode weight="fill" /> Check-in scanner</h3>
      <p className="muted" style={{ fontSize: ".85rem" }}>Scan a ticket QR (or type the bib / order code) to admit a guest.</p>
      <form className="row" onSubmit={go}>
        <input className="input" placeholder="Scan QR or enter bib…" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
        <button className="btn btn-primary">Check in</button>
      </form>
      {last && (
        <div className={`chip ${last.ok ? "green" : "red"}`} style={{ width: "100%", padding: "10px 14px" }}>
          {last.ok ? <CheckCircle weight="fill" /> : <XCircle weight="fill" />}
          {last.ok ? (last.already ? "Already checked in: " : "Admitted: ") : ""}{last.msg}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, v, k }) {
  return (
    <div className="stat stack" style={{ "--gap": "6px" }}>
      <span className="row" style={{ color: "var(--green-600)" }}>{icon}</span>
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </div>
  );
}
