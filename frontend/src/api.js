// Tikiti API client — general ticketing platform.
const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const TOKEN_KEY = "tikiti_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

async function req(path, opts = {}) {
  const token = getToken();
  const isForm = opts.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(opts.headers || {}),
    },
    ...opts,
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || (Array.isArray(body) ? body[0] : JSON.stringify(body));
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

const qs = (params) => {
  const s = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v != null && v !== "")
  ).toString();
  return s ? `?${s}` : "";
};

export const api = {
  // discovery
  categories: () => req("/categories/"),
  events: (params) => req(`/events/${qs(params)}`),
  event: (slug) => req(`/events/${slug}/`),
  leaderboard: (slug, ticketType) =>
    req(`/events/${slug}/leaderboard/${qs({ ticket_type: ticketType })}`),
  // buying
  createOrder: (payload) =>
    req("/orders/", { method: "POST", body: JSON.stringify(payload) }),
  order: (reference) => req(`/orders/${reference}/`),
  pollOrder: (reference) => req(`/orders/${reference}/poll/`, { method: "POST" }),
  myOrders: () => req("/orders/mine/"),
  ordersByPhone: (phone) => req(`/orders/by-phone/${qs({ phone })}`),
  // tickets
  ticket: ({ qr, bib }) => req(`/tickets/lookup/${qs({ qr, bib })}`),
  checkIn: (qr) => req(`/tickets/${qr}/check-in/`, { method: "POST" }),
  // organizer
  organizerEvents: () => req("/organizer/events/"),
  createEvent: (payload) =>
    req("/organizer/events/", { method: "POST", body: JSON.stringify(payload) }),
  organizerDashboard: (slug) => req(`/organizer/events/${slug}/dashboard/`),
  uploadCover: (slug, file) => {
    const fd = new FormData();
    fd.append("cover", file);
    return req(`/organizer/events/${slug}/cover/`, { method: "POST", body: fd });
  },
  // auth
  googleLogin: (payload) =>
    req("/auth/google/", { method: "POST", body: JSON.stringify(payload) }),
  me: () => req("/auth/me/"),
  logout: () => req("/auth/logout/", { method: "POST" }),
};

// --- helpers -----------------------------------------------------------------
export const money = (amount, currency = "USD") =>
  currency === "ZIG"
    ? `ZiG ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : `$${Number(amount).toFixed(Number(amount) % 1 ? 2 : 0)}`;

export const PAYMENTS = {
  ECOCASH:  { label: "EcoCash",  color: "#0A8A3D", short: "EC", logo: "/payment/ecocash.png" },
  ONEMONEY: { label: "OneMoney", color: "#E85D04", short: "1$", logo: "/payment/one-money.png" },
  INNBUCKS: { label: "InnBucks", color: "#6A3FB0", short: "IB", logo: "/payment/innbucks.png" },
  OMARI:    { label: "O'mari",   color: "#1F8A70", short: "OM", logo: "/payment/omari.png" },
  ZIPIT:    { label: "ZimSwitch", color: "#1F5FA8", short: "ZS", logo: "/payment/zimswitch.png" },
  CARD:     { label: "Visa / Mastercard", color: "#1A1F71", short: "VM", logo: "/payment/visa-mastercard.png" },
};

// Cohesive blue-family covers (on-brand) with enough hue variety to tell
// categories apart at a glance.
// Light theme tint per category — the colour the cover image bleeds into the card.
export const CATEGORY_TINT = {
  MUSIC:      "#ECEAFB",
  SPORT:      "#E4EEFE",
  MARATHON:   "#E5ECFB",
  CONFERENCE: "#E6F1F6",
  THEATRE:    "#F1E9F7",
  FESTIVAL:   "#E3F4F9",
  COMEDY:     "#E7F0FE",
  WORKSHOP:   "#E9EEF2",
  OTHER:      "#E9ECF3",
};

export const CATEGORY_GRADIENT = {
  MUSIC:      "linear-gradient(150deg,#312E81,#4F46E5)",   // indigo
  SPORT:      "linear-gradient(150deg,#00276E,#0068F8)",   // brand blue
  MARATHON:   "linear-gradient(150deg,#001850,#0068F8)",   // navy → blue
  CONFERENCE: "linear-gradient(150deg,#0E3A52,#1E88B5)",   // teal-blue
  THEATRE:    "linear-gradient(150deg,#3A1E5C,#7A3BA8)",   // violet
  FESTIVAL:   "linear-gradient(150deg,#0057E6,#00B4D8)",   // blue → cyan
  COMEDY:     "linear-gradient(150deg,#0068F8,#4D94FF)",   // bright sky
  WORKSHOP:   "linear-gradient(150deg,#243B53,#486581)",   // slate
  OTHER:      "linear-gradient(150deg,#1E2A4A,#3A4E7A)",   // navy slate
};

// --- share & calendar helpers ------------------------------------------------
const origin = () => (typeof window !== "undefined" ? window.location.origin : "");

export const waShare = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const waTo = (phone, text) =>
  `https://wa.me/${String(phone).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
export const eventUrl = (slug) => `${origin()}/e/${slug}`;
export const ticketUrl = (qr) => `${origin()}/t/${qr}`;

export function googleCalUrl({ title, start, end, location, details }) {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const s = fmt(start);
  const e = fmt(end || new Date(new Date(start).getTime() + 3 * 3600 * 1000));
  const p = new URLSearchParams({
    action: "TEMPLATE", text: title || "", dates: `${s}/${e}`,
    details: details || "", location: location || "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export const fmtDate = (iso, opts) =>
  new Date(iso).toLocaleDateString("en-GB", opts || {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
