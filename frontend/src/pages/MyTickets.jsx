import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, WhatsappLogo, MagnifyingGlass } from "@phosphor-icons/react";
import { api, waTo, ticketUrl } from "../api";
import { useAuth, GoogleButton } from "../auth.jsx";
import { TicketCard } from "./OrderPage.jsx";
import { Empty } from "../components/ui.jsx";
import { TicketListSkeleton } from "../components/skeletons.jsx";

export default function MyTickets() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    if (user) api.myOrders().then(setOrders).catch(() => setOrders([]));
  }, [user]);

  if (!ready) return <TicketListSkeleton />;
  if (!user) return <FindByPhone />;
  if (!orders) return <TicketListSkeleton />;

  const tickets = orders.flatMap((o) => o.tickets);
  return (
    <div className="container section stack fade-in" style={{ maxWidth: 640, "--gap": "16px" }}>
      <h1>My tickets</h1>
      {tickets.length === 0 ? (
        <Empty>No tickets yet. <Link to="/" style={{ color: "var(--green-700)" }}>Browse events →</Link></Empty>
      ) : (
        tickets.map((t) => <TicketCard key={t.qr_token} t={t} />)
      )}
    </div>
  );
}

/* Guests recover tickets with just a phone number — no email or login. */
function FindByPhone() {
  const [phone, setPhone] = useState("");
  const [tickets, setTickets] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function find(e) {
    e.preventDefault();
    setBusy(true); setError(""); setTickets(null);
    try {
      const orders = await api.ordersByPhone(phone);
      const found = orders.flatMap((o) => o.tickets);
      setTickets(found);
      if (found.length === 0) setError("No tickets found for that number.");
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="container section stack fade-in" style={{ maxWidth: 480, "--gap": "18px" }}>
      <div className="center stack" style={{ "--gap": "10px", alignItems: "center" }}>
        <img src="/t-logo.png" alt="Ticketboy" style={{ width: 180, margin: "0 auto" }} />
        <h1>Find my ticket</h1>
        <p className="muted">Enter the phone number you bought with and we&apos;ll show your tickets. No sign-in needed.</p>
      </div>

      <form className="stack" onSubmit={find} style={{ "--gap": "10px" }}>
        <div className="field">
          <label className="row" style={{ gap: 6 }}><Phone weight="fill" /> Your phone number</label>
          <input className="input" inputMode="tel" placeholder="077 123 4567"
            value={phone} onChange={(e) => setPhone(e.target.value)} style={{ fontSize: "1.1rem" }} />
        </div>
        <button className="btn btn-gold btn-lg btn-block" disabled={busy || phone.replace(/\D/g, "").length < 9}>
          {busy ? "Searching…" : "Show my tickets"}
        </button>
      </form>

      {error && <div className="chip red" style={{ width: "100%" }}>{error}</div>}

      {tickets?.length > 0 && (
        <div className="stack" style={{ "--gap": "12px" }}>
          {tickets.map((t) => (
            <div key={t.qr_token} className="stack" style={{ "--gap": "8px" }}>
              <TicketCard t={t} />
              <a className="btn btn-ghost btn-block" target="_blank" rel="noreferrer"
                href={waTo(phone, `My Ticketboy ticket for ${t.event_title}: ${ticketUrl(t.qr_token)}`)}>
                <WhatsappLogo weight="fill" color="#25D366" /> Send to my WhatsApp
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="hair" />
      <div className="center stack" style={{ "--gap": "10px", alignItems: "center" }}>
        <p className="muted" style={{ fontSize: ".9rem" }}>Bought with a Google account?</p>
        <GoogleButton />
      </div>
    </div>
  );
}
