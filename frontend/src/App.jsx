import { useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Ticket, MagnifyingGlass, Storefront, SignOut, CaretDown,
} from "@phosphor-icons/react";
import { useAuth, GoogleButton } from "./auth.jsx";
import { PAYMENTS } from "./api";

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand">
            <img src="/t-favicon.png" alt="" className="brand-logo" />
            <span>Ticket<span className="brand-boy">boy</span></span>
          </Link>
          <div className="row" style={{ gap: 14 }}>
            <nav className="nav-links">
              <NavLink to="/" end>
                <MagnifyingGlass size={20} weight="bold" /> <span className="label">Browse</span>
              </NavLink>
              <NavLink to="/tickets">
                <Ticket size={20} weight="fill" /> <span className="label">My tickets</span>
              </NavLink>
              <NavLink to="/organize">
                <Storefront size={20} weight="fill" /> <span className="label">Organize</span>
              </NavLink>
            </nav>
            <AuthControl />
          </div>
        </div>
      </header>

      <main><Outlet /></main>

      <footer className="footer">
        <div className="container stack" style={{ "--gap": "16px" }}>
          <div className="hair" />
          <div className="footer-row">
            <div className="row">
              <img src="/t-favicon.png" alt="" className="brand-logo" />
              <strong style={{ color: "var(--green-900)" }}>Ticket<span className="brand-boy">boy</span></strong>
              <span className="muted hide-mobile">· Tickets for every Zimbabwean event</span>
            </div>
            <nav className="footer-links">
              <Link to="/legal/terms">Terms &amp; Conditions</Link>
              <Link to="/legal/cookies">Cookies</Link>
              <Link to="/legal/legal">Legal</Link>
              <Link to="/legal/contact">Contact &amp; Support</Link>
            </nav>
          </div>
          <div className="hair" />
          <div className="footer-row footer-bottom">
            <span className="muted">© 2026 Ticketboy · Harare, Zimbabwe</span>
            <div className="pay-strip">
              {Object.values(PAYMENTS).map((p) => (
                <span className="pay-badge" key={p.label}><img src={p.logo} alt={p.label} /></span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function AuthControl() {
  const { user, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches
  );
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    const mq = window.matchMedia("(max-width: 600px)");
    const onMq = () => setMobile(mq.matches);
    mq.addEventListener("change", onMq);
    return () => { document.removeEventListener("mousedown", close); mq.removeEventListener("change", onMq); };
  }, []);

  if (!ready) return null;
  if (!user) return <GoogleButton type={mobile ? "icon" : "standard"} />;

  const initials = (user.name || user.email || "?").trim().slice(0, 1).toUpperCase();
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="row" onClick={() => setOpen((o) => !o)}
        style={{ border: "none", background: "none", cursor: "pointer", gap: 6, padding: 0 }}>
        {user.avatar_url ? (
          <img className="avatar" src={user.avatar_url} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="avatar">{initials}</div>
        )}
        <CaretDown size={13} weight="bold" className="hide-mobile" />
      </button>
      {open && (
        <div className="menu fade-in">
          <div style={{ padding: "8px 12px" }}>
            <strong style={{ display: "block", fontSize: ".92rem" }}>{user.name}</strong>
            <span className="muted" style={{ fontSize: ".8rem" }}>{user.email}</span>
          </div>
          <div className="divider" />
          <Link to="/tickets" onClick={() => setOpen(false)}><Ticket size={17} /> My tickets</Link>
          <Link to="/organize" onClick={() => setOpen(false)}><Storefront size={17} /> Organize</Link>
          <div className="divider" />
          <button onClick={logout}><SignOut size={17} /> Sign out</button>
        </div>
      )}
    </div>
  );
}
