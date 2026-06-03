import { useParams, Link } from "react-router-dom";
import {
  EnvelopeSimple, WhatsappLogo, Phone, WarningCircle, ArrowLeft, Scales,
  FileText, Cookie, Headset,
} from "@phosphor-icons/react";

const SUPPORT = {
  email: "support@ticketboy.co.zw",
  complaints: "complaints@ticketboy.co.zw",
  phone: "+263 78 000 0000",
  whatsapp: "+263 78 000 0000",
  hours: "Mon to Sat, 8am to 8pm CAT",
};

const PAGES = {
  terms: {
    icon: FileText, title: "Terms & Conditions", updated: "June 2026",
    intro: "These terms govern your use of Ticketboy and the purchase of tickets to events listed on the platform.",
    sections: [
      ["Buying tickets", "When you buy a ticket you enter an agreement with the event organiser, not Ticketboy. We act as the booking and ticketing agent. Your ticket (and its QR code) is your proof of purchase and must be presented for entry."],
      ["Prices & payment", "Prices are shown in USD with a ZiG equivalent at checkout. Payment is taken in full at the time of purchase via EcoCash, OneMoney, InnBucks, ZIPIT or card. A booking fee may apply and is shown before you pay."],
      ["Refunds & cancellations", "Refund eligibility is set by each event organiser. If an event is cancelled or materially rescheduled, you are entitled to a refund of the ticket price in line with the organiser's policy. Booking fees are non-refundable unless required by law."],
      ["Entry & conduct", "Organisers may refuse entry for invalid, duplicated or resold tickets, or for breach of venue rules. One QR code admits one person; re-entry rules are set per event."],
      ["Liability", "Ticketboy provides the platform 'as is'. To the extent permitted by law, our liability is limited to the value of the ticket. Organisers are responsible for the event itself."],
    ],
  },
  cookies: {
    icon: Cookie, title: "Cookie Policy", updated: "June 2026",
    intro: "Ticketboy uses a small number of cookies and similar technologies to keep the platform working and to understand how it is used.",
    sections: [
      ["Essential cookies", "Needed for the site to work: keeping you signed in, holding your cart through checkout, and securing payments. These can't be switched off."],
      ["Analytics", "Help us see which events and pages are popular so we can improve the platform. These are anonymised and aggregated."],
      ["Managing cookies", "You can clear or block cookies in your browser settings. Blocking essential cookies may stop sign-in and checkout from working."],
    ],
  },
  legal: {
    icon: Scales, title: "Legal & Privacy", updated: "June 2026",
    intro: "How Ticketboy handles your data and the legal notices that apply to the platform.",
    sections: [
      ["Who we are", "Ticketboy is a Zimbabwean ticketing platform connecting event organisers with attendees. Operated from Harare, Zimbabwe."],
      ["Data we collect", "Your name and contact details, the tickets you buy, and payment confirmation. Organisers receive the attendee details necessary to run their event. We never sell your personal data."],
      ["How we use it", "To issue and verify tickets, process payments, send you confirmations, and provide support. We keep records as required for accounting and dispute resolution."],
      ["Your rights", "You may request a copy of your data, ask us to correct it, or request deletion where we are not legally required to keep it. Contact us using the details on the Contact & Support page."],
      ["Intellectual property", "The Ticketboy name, logo and platform are the property of Ticketboy. Event content belongs to the respective organisers."],
    ],
  },
};

export default function LegalPage() {
  const { slug } = useParams();
  if (slug === "contact") return <Contact />;
  const page = PAGES[slug] || PAGES.terms;
  const Icon = page.icon;

  return (
    <div className="container section fade-in" style={{ maxWidth: 740 }}>
      <Link to="/" className="row muted" style={{ fontSize: ".9rem", marginBottom: 16 }}>
        <ArrowLeft /> Back to events
      </Link>
      <div className="stack" style={{ "--gap": "8px", marginBottom: 18 }}>
        <span className="dist-badge" style={{ width: 52, height: 52 }}>
          <Icon size={26} weight="fill" color="var(--green-600)" />
        </span>
        <h1 className="serif">{page.title}</h1>
        <span className="muted" style={{ fontSize: ".85rem" }}>Last updated {page.updated}</span>
      </div>

      <p className="muted" style={{ marginBottom: 22 }}>{page.intro}</p>

      <div className="stack" style={{ "--gap": "18px" }}>
        {page.sections.map(([h, body]) => (
          <div key={h} className="stack" style={{ "--gap": "5px" }}>
            <h3>{h}</h3>
            <p className="muted">{body}</p>
          </div>
        ))}
      </div>

      <div className="card card-p" style={{ marginTop: 26, background: "var(--champagne-2)", borderColor: "var(--green-100)" }}>
        <p className="muted" style={{ fontSize: ".85rem" }}>
          This is a working template and not yet legal advice. Have it reviewed by a
          qualified legal practitioner before launch. Questions?{" "}
          <Link to="/legal/contact" style={{ color: "var(--green-600)", fontWeight: 600 }}>Contact us</Link>.
        </p>
      </div>

      <div className="footer-links" style={{ marginTop: 22, justifyContent: "center" }}>
        <Link to="/legal/terms">Terms</Link>
        <Link to="/legal/cookies">Cookies</Link>
        <Link to="/legal/legal">Legal</Link>
        <Link to="/legal/contact">Contact &amp; Support</Link>
      </div>
    </div>
  );
}

function Contact() {
  return (
    <div className="container section fade-in" style={{ maxWidth: 740 }}>
      <Link to="/" className="row muted" style={{ fontSize: ".9rem", marginBottom: 16 }}>
        <ArrowLeft /> Back to events
      </Link>
      <div className="stack" style={{ "--gap": "8px", marginBottom: 20 }}>
        <span className="dist-badge" style={{ width: 52, height: 52 }}>
          <Headset size={26} weight="fill" color="var(--green-600)" />
        </span>
        <h1 className="serif">Contact &amp; Support</h1>
        <span className="muted">We're here {SUPPORT.hours}.</span>
      </div>

      <div className="grid-2">
        <Channel icon={<EnvelopeSimple weight="fill" />} label="Email support"
          value={SUPPORT.email} href={`mailto:${SUPPORT.email}`} />
        <Channel icon={<WhatsappLogo weight="fill" />} label="WhatsApp"
          value={SUPPORT.whatsapp} href={`https://wa.me/${SUPPORT.whatsapp.replace(/[^0-9]/g, "")}`} />
        <Channel icon={<Phone weight="fill" />} label="Call us"
          value={SUPPORT.phone} href={`tel:${SUPPORT.phone.replace(/\s/g, "")}`} />
        <Channel icon={<WarningCircle weight="fill" />} label="Complaints"
          value={SUPPORT.complaints} href={`mailto:${SUPPORT.complaints}`} tone="clay" />
      </div>

      <div className="card card-p stack" style={{ marginTop: 18, "--gap": "8px" }}>
        <h3>Raising a complaint</h3>
        <p className="muted">
          Tell us your order reference (starts with <strong>TKT-</strong>), the event,
          and what went wrong. We acknowledge every complaint within 24 hours and aim to
          resolve it within 5 working days. Unresolved payment issues can be escalated to
          your mobile-money provider or bank.
        </p>
      </div>
    </div>
  );
}

function Channel({ icon, label, value, href, tone }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="card card-p card-hover row"
      style={{ textDecoration: "none", gap: 14 }}>
      <span className="dist-badge" style={{ width: 46, height: 46,
        color: tone === "clay" ? "var(--clay)" : "var(--green-600)" }}>{icon}</span>
      <div>
        <div className="muted" style={{ fontSize: ".75rem", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
        <strong>{value}</strong>
      </div>
    </a>
  );
}
