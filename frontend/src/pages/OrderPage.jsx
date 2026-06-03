import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle, Confetti, ArrowRight, Receipt, DeviceMobile,
} from "@phosphor-icons/react";
import { api, money, fmtDate, fmtTime } from "../api";
import { CategoryIcon } from "../components/ui.jsx";
import { OrderSkeleton } from "../components/skeletons.jsx";

export default function OrderPage() {
  const { reference } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => { api.order(reference).then(setOrder).catch(() => setOrder(false)); }, [reference]);

  // Awaiting payment (Paynow mobile): poll until confirmed.
  useEffect(() => {
    if (!order || order.status === "PAID") return;
    const id = setInterval(() => {
      api.pollOrder(reference).then(setOrder).catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [order?.status, reference]); // eslint-disable-line

  if (order === false) return <div className="container section">Order not found.</div>;
  if (!order) return <OrderSkeleton />;

  if (order.status !== "PAID") {
    return (
      <div className="container section fade-in" style={{ maxWidth: 520 }}>
        <div className="card card-p center stack" style={{ "--gap": "12px", alignItems: "center" }}>
          <DeviceMobile size={40} weight="fill" color="var(--green-600)" />
          <h2>Confirm on your phone</h2>
          <p className="muted">
            Check your phone for the {order.payment_method === "ONEMONEY" ? "OneMoney" : "EcoCash"} prompt
            and enter your PIN to pay <strong>{money(order.total, order.currency)}</strong>.
          </p>
          <span className="chip"><Receipt size={14} /> {order.reference}</span>
          <p className="muted" style={{ fontSize: ".85rem" }}>This page updates automatically once you&apos;ve paid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container section fade-in" style={{ maxWidth: 640 }}>
      <div className="center stack" style={{ "--gap": "6px", marginBottom: 20 }}>
        <Confetti size={36} weight="fill" color="var(--brass)" />
        <h2 className="serif">You&apos;re going!</h2>
        <p className="muted">
          {order.tickets.length} {order.tickets.length === 1 ? "ticket" : "tickets"} for <strong>{order.event_title}</strong>
        </p>
        <span className="chip green"><Receipt size={14} /> {order.reference} · paid {money(order.total, order.currency)}</span>
      </div>

      <div className="stack">
        {order.tickets.map((t, i) => <TicketCard key={t.qr_token} t={t} idx={i} />)}
      </div>

      <div className="center" style={{ marginTop: 22 }}>
        <Link to="/tickets" className="btn btn-ghost">All my tickets <ArrowRight weight="bold" /></Link>
      </div>
    </div>
  );
}

export function TicketCard({ t }) {
  const checked = t.status === "CHECKED_IN";
  return (
    <Link to={`/t/${t.qr_token}`} className="tkt-wrap" style={{ marginTop: 14 }}>
      <div className="tkt">
        <div className="stub">
          <div className="qr-wrap">
            <QRCodeSVG value={`TICKETBOY:${t.qr_token}`} size={92} fgColor="#001850" level="M" />
          </div>
          {t.bib_number ? <strong style={{ fontFamily: "var(--serif)" }}>#{t.bib_number}</strong>
            : <span className="muted" style={{ fontSize: ".72rem" }}>Scan to enter</span>}
        </div>
        <div className="body stack" style={{ "--gap": "6px" }}>
        <div className="tkt-chips">
          <span className="chip"><CategoryIcon category={t.event_category} size={13} weight="fill" /> {t.ticket_type_name}</span>
          {checked
            ? <span className="chip green"><CheckCircle weight="fill" size={13} /> Checked in</span>
            : <span className="chip gold">Valid</span>}
        </div>
        <strong className="clamp-2">{t.event_title}</strong>
        <div className="muted" style={{ fontSize: ".85rem" }}>
          {fmtDate(t.event_starts_at)} · {fmtTime(t.event_starts_at)}<br />
          {t.event_venue}, {t.event_city}
        </div>
        <div className="muted" style={{ fontSize: ".8rem" }}>Holder: {t.holder_name}</div>
        </div>
      </div>
    </Link>
  );
}
