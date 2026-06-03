import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Lock } from "@phosphor-icons/react";
import { api, money, PAYMENTS } from "../api";
import { useAuth } from "../auth.jsx";

export default function Checkout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();
  const items = state?.items || [];
  const event = state?.event;

  const [form, setForm] = useState({
    buyer_name: "", buyer_email: "", buyer_phone: "",
    currency: "USD", payment_method: "ECOCASH",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, buyer_name: f.buyer_name || user.name || "", buyer_email: f.buyer_email || user.email || "" }));
  }, [user]);

  if (!items.length) {
    return (
      <div className="container section center stack">
        <p className="muted">Your cart is empty.</p>
        <Link to={`/e/${slug}`} className="btn btn-primary">Back to event</Link>
      </div>
    );
  }

  const rate = form.currency === "ZIG" ? Number(event?.zig_per_usd || 30) : 1;
  const subtotal = items.reduce((s, i) => s + i.price_usd * i.quantity, 0);
  const total = subtotal * rate;

  async function pay() {
    setBusy(true); setError("");
    try {
      const order = await api.createOrder({
        buyer_name: form.buyer_name, buyer_email: form.buyer_email,
        buyer_phone: form.buyer_phone, payment_method: form.payment_method,
        currency: form.currency,
        items: items.map((i) => ({ ticket_type: i.ticket_type, quantity: i.quantity })),
      });
      const pay = order.payment;
      if (pay && !pay.success) { setError(pay.error || "Payment could not start."); setBusy(false); return; }
      if (pay?.redirect_url) { window.location.href = pay.redirect_url; return; }  // card / web
      navigate(`/order/${order.reference}`, { replace: true });  // paid, or mobile → order page polls
    } catch (e) { setError(e.message); setBusy(false); }
  }

  const valid = form.buyer_name.trim().length > 1 && (form.buyer_email || form.buyer_phone);

  return (
    <div className="container section fade-in" style={{ maxWidth: 880 }}>
      <Link to={`/e/${slug}`} className="row muted" style={{ marginBottom: 16, fontSize: ".9rem" }}>
        <ArrowLeft /> Back
      </Link>
      <div className="grid-cols">
        {/* details */}
        <div className="card card-p stack">
          <h2 className="serif">Checkout</h2>
          <div className="field">
            <label>Full name *</label>
            <input className="input" value={form.buyer_name}
              onChange={(e) => set("buyer_name", e.target.value)} placeholder="e.g. Tatenda Moyo" />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Email</label>
              <input className="input" value={form.buyer_email}
                onChange={(e) => set("buyer_email", e.target.value)} placeholder="you@email.com" />
            </div>
            <div className="field">
              <label>Phone</label>
              <input className="input" value={form.buyer_phone}
                onChange={(e) => set("buyer_phone", e.target.value)} placeholder="+263 7…" />
            </div>
          </div>
          <p className="muted" style={{ fontSize: ".8rem" }}>We send your tickets here. One QR per ticket.</p>

          <div className="divider" />
          <h3>Payment</h3>
          <div className="seg">
            {["USD", "ZIG"].map((c) => (
              <button key={c} className={form.currency === c ? "on" : ""} onClick={() => set("currency", c)}>
                {c === "USD" ? "USD" : "ZiG"}
              </button>
            ))}
          </div>
          <div className="pay">
            {Object.entries(PAYMENTS).map(([key, p]) => {
              const disabled = form.currency === "ZIG" && key === "CARD";
              return (
                <button key={key} type="button" disabled={disabled} title={p.label} aria-label={p.label}
                  className={form.payment_method === key ? "selected" : ""}
                  onClick={() => set("payment_method", key)}>
                  <img src={p.logo} alt={p.label} />
                </button>
              );
            })}
          </div>
        </div>

        {/* summary */}
        <div className="summary">
          <div className="card card-p stack">
            <h3>{event?.title}</h3>
            <div className="divider" />
            {items.map((i) => (
              <div key={i.ticket_type} className="spread">
                <span>{i.quantity} × {i.name}</span>
                <span>{money(i.price_usd * i.quantity * rate, form.currency)}</span>
              </div>
            ))}
            <div className="divider" />
            <div className="spread">
              <strong>Total</strong>
              <strong style={{ fontSize: "1.4rem", fontFamily: "var(--serif)" }}>{money(total, form.currency)}</strong>
            </div>
            {error && <div className="chip red" style={{ width: "100%" }}>{error}</div>}
            <button className="btn btn-gold btn-lg btn-block" disabled={!valid || busy} onClick={pay}>
              {busy ? "Processing…" : <><Lock weight="fill" /> Pay {money(total, form.currency)}</>}
            </button>
            <p className="row muted" style={{ fontSize: ".78rem" }}>
              <ShieldCheck weight="fill" color="var(--green-600)" /> Secure checkout. Tickets issued instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
