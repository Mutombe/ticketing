# Tikiti — Zimbabwe's ticketing platform

**Tickets for every Zimbabwean event.** One platform for concerts, football,
festivals, conferences, comedy, theatre — and marathons (with bib timing &
results). Organizers create events and sell tickets; customers browse, buy, and
get a QR ticket on their phone; organizers track sales and check people in.

Built with **Django + DRF**, **React + Vite + Phosphor**, **Neon Postgres**,
**DigitalOcean Spaces** (event images), and **Google sign-in**.

> **Secrets** live in `backend/.env` and `frontend/.env` (gitignored).
> Copy `backend/.env.example` → `backend/.env`. Never commit real keys.

---

## The product

**Customers** — browse by category or search → open an event → pick ticket types
& quantities → checkout (EcoCash / OneMoney / InnBucks / ZIPIT / card, USD or
ZiG) → get an order with a **QR ticket per seat**. "My tickets" collects every
purchase when signed in; guests keep their order link.

**Organizers** — sign in with Google → **create an event** (category, date,
venue, description, cover image, and any number of ticket types/prices) →
**dashboard** with live sales, revenue (USD + ZiG), payment mix, sales by ticket
type, recent orders, and a **check-in scanner** that admits guests by QR or bib.

**Marathon** is just one category: its ticket types are distances, its tickets
carry a bib + chip, and it adds checkpoints, live splits, and a finish-time
leaderboard (gun vs chip time).

---

## Run it locally

Two terminals.

### Backend (Django, :8000) — develop on SQLite
```powershell
cd backend
# DATABASE_URL in .env points at Neon; blank it for local SQLite dev:
$env:DATABASE_URL=''
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed     # 6 demo events, ~2900 tickets
.\.venv\Scripts\python.exe manage.py runserver 8000
```
To run against **Neon** instead, just don't blank `DATABASE_URL`.

### Frontend (React) — must be port 5178 (Google's authorized origin)
```powershell
cd frontend
npm run dev -- --port 5178 --strictPort
```
Open http://localhost:5178.

---

## Architecture

```
backend/
  config/                 Django project (settings, urls)
  events/                 THE core app
    models.py             Event · TicketType · Order · Ticket
                          Checkpoint · SplitTime · RaceResult (marathon)
    serializers.py        list/detail, order checkout, organizer create
    views.py              public browse, orders, tickets, organizer, check-in
    management/commands/seed.py   diverse demo data
  accounts/               Google sign-in → DRF token (Profile)

frontend/src/
  api.js                  fetch client + helpers (money, gradients, dates)
  auth.jsx                Google Identity Services + AuthProvider
  components/ui.jsx       Cover, Spinner, Empty
  pages/                  Home, EventPage, Checkout, OrderPage, TicketView,
                          MyTickets, Organizer, OrganizerDashboard, Results
```

### Key API endpoints
| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/categories/` | categories with event counts |
| GET  | `/api/events/?category=&q=&featured=` | browse / search |
| GET  | `/api/events/{slug}/` | event + ticket types |
| POST | `/api/orders/` | checkout → order + QR tickets |
| GET  | `/api/orders/{ref}/` | order + tickets (by reference) |
| GET  | `/api/orders/mine/` | my orders (auth) |
| GET  | `/api/tickets/lookup/?qr=&bib=` | find a ticket |
| POST | `/api/tickets/{qr}/check-in/` | admit a guest (organizer) |
| GET/POST | `/api/organizer/events/` | list / create my events (auth) |
| GET  | `/api/organizer/events/{slug}/dashboard/` | live sales (auth) |
| POST | `/api/organizer/events/{slug}/cover/` | upload cover → DO Spaces |
| GET  | `/api/events/{slug}/leaderboard/` | marathon results |
| POST | `/api/auth/google/` · GET `/api/auth/me/` · POST `/api/auth/logout/` | auth |

### Design
"Safari-luxe": deep emerald + brass/champagne + porcelain, **Fraunces** display
serif over **Inter** UI. Category-coloured event covers, layered soft shadows,
fully responsive 320px → desktop.

### Notes
- Payments are **simulated** (orders mark PAID instantly) — wire Paynow/EcoCash next.
- Cover images upload to DO Spaces (`sfo3`, bucket `tikiti`) and serve publicly.
- Rotate any secrets pasted into chat.
