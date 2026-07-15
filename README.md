# Nagyees Laundry Service — Laundry Management System

A full-stack system for a laundry shop with three roles:

- **IT Administrator** — "the God of the system." Creates, edits, disables, and deletes every account; assigns roles/privileges. Full access to everything.
- **Owner / Admin** — read-only overseer. Sees revenue, order volume, staff activity, and system health from a live dashboard.
- **Shop Worker** — runs the counter. Adds customers, takes orders, updates order status, takes payment (cash or Mobile Money via Paystack), and the system automatically texts the customer at each key step.

No email logins anywhere — every account signs in with a **username + password** only.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy, SQLite |
| Auth | JWT (python-jose) + bcrypt password hashing |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Payments | Paystack Charge API — Mobile Money (MTN / Telecel Cash / AirtelTigo) |
| SMS | Africa's Talking |

## How payments work

At checkout, the worker enters the customer's Mobile Money number and amount. The backend calls Paystack's `/charge` endpoint with `mobile_money: { phone, provider }`. The customer's network then prompts them **on their own phone** to enter their MoMo PIN to approve — nothing else is needed from the shop side. The worker can poll for the final status, and Paystack's webhook (`/api/payments/webhook`) also updates it automatically when it settles. Cash payments are recorded directly.

**Until you add real Paystack/Africa's Talking API keys, the system runs in MOCK_MODE**: payments simulate a realistic "awaiting approval" flow and SMS messages are printed to the backend console/log and saved to the database — so you can fully demo and test the system with zero external accounts.

## Project layout

```
laundry-system/
├── backend/                 FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── core/            config, security (JWT/bcrypt)
│   │   ├── db/               SQLAlchemy session + seed script
│   │   ├── models/           User, Customer, Order, Payment, Notification, ActivityLog
│   │   ├── schemas/          Pydantic request/response models
│   │   ├── api/routes/       auth, users, customers, orders, payments, notifications, dashboard
│   │   └── services/         paystack_service.py, sms_service.py, notification_service.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/                 Next.js app (shadcn/ui + Tailwind)
    ├── app/
    │   ├── login/
    │   ├── admin/             Owner dashboard (read-only)
    │   ├── worker/            Today view, New Order, Orders, Customers
    │   └── it-admin/          System overview + Users & Access
    ├── components/            DashboardShell, OrderDetailDialog, shadcn/ui primitives
    └── lib/                   API client, auth context, shared types
```

## Getting started

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # edit if you have real Paystack / Africa's Talking keys
python -m app.db.seed           # creates the first IT Admin account
uvicorn app.main:app --reload --port 8000
```

The seed script prints the first IT Admin's username/password — **log in and change it immediately**, then use the IT Admin panel to create the Owner and Shop Worker accounts (no need to touch the database directly).

API docs (Swagger) are available at `http://localhost:8000/docs` once the server is running.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`. It talks to the backend at `http://localhost:8000` by default — override with a `.env.local` containing `NEXT_PUBLIC_API_URL=https://your-api-host`.

### 3. Going live with real payments & SMS

In `backend/.env`:

```
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxx
AT_USERNAME=your_africastalking_username
AT_API_KEY=your_africastalking_api_key
MOCK_MODE=false
```

Also point Paystack's webhook (Dashboard → Settings → API Keys & Webhooks) at `https://your-api-host/api/payments/webhook`, and in production verify the `x-paystack-signature` header (HMAC-SHA512 against your secret key) before trusting webhook payloads — the current webhook handler has a comment marking exactly where to add this.

## Roles & permissions, in the code

Every protected endpoint uses a `require_roles(...)` dependency, so permission logic lives in one place (`app/api/deps.py`) rather than scattered `if` checks:

- `IT_ADMIN` only: create/edit/delete/disable users, reset passwords, change roles.
- `WORKER` + `IT_ADMIN`: create customers/orders, update order status, take payments, send SMS.
- `ADMIN` (Owner) + `IT_ADMIN`: the `/api/dashboard/overview` endpoint (revenue, activity log, staff stats).

Every meaningful action (login, order created, payment taken, user created/deleted, etc.) is written to an `ActivityLog` table, visible to the Owner and IT Admin — so the Owner really can "see everything from home."

## Deploying for free

This costs $0/month and needs no credit card anywhere in the chain. The one thing to know going in: **swap SQLite for a free hosted Postgres**. Free backend hosts wipe their local disk on every restart, so `laundry.db` won't survive — a hosted Postgres does. The code already supports this with zero changes (it's plain SQLAlchemy); you just point `DATABASE_URL` at Postgres instead of a local file. `psycopg2-binary` is already in `requirements.txt` for this.

### 1. Push the code to GitHub
Create a repo and push both `backend/` and `frontend/` (a monorepo is fine — both Render and Vercel let you set a "root directory").

### 2. Database — Neon (neon.tech)
Free forever, no card, 0.5 GB storage. Create a project, then copy the **pooled connection string** it gives you (starts with `postgresql://...`).

### 3. Backend — Render (render.com), free web service
- New → Web Service → connect your repo → root directory `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment variables:
  - `DATABASE_URL` = your Neon connection string
  - `SECRET_KEY` = any long random string
  - `FRONTEND_ORIGIN` = your Vercel URL (add this after step 4, then redeploy)
  - `MOCK_MODE` = `true` until you add real Paystack/Africa's Talking keys
- After the first deploy, open the Render **Shell** tab for this service and run `python -m app.db.seed` once, to create the IT Admin login.

Free-tier reality: this service spins down after 15 minutes idle, so the first request after a quiet period takes ~30-60 seconds to wake up. Fine for a single shop; everything after that first request is normal speed.

### 4. Frontend — Vercel (vercel.com)
- New Project → import the same repo → root directory `frontend`
- Environment variable: `NEXT_PUBLIC_API_URL` = your Render backend URL
- Deploy. Vercel gives you a `*.vercel.app` URL immediately (custom domains are free too).

Then go back to Render and set `FRONTEND_ORIGIN` to that Vercel URL so CORS allows it, and redeploy the backend.

### That's it
Total cost: $0. Trade-offs you're accepting: the backend cold-starts after idling, and Neon's free compute also sleeps after ~5 minutes idle (wakes in well under a second, so it's not noticeable in practice). If the shop grows and this becomes annoying, the cheapest fix is a $7/month Render Starter instance (no more spin-down) — everything else stays the same.

## Known follow-ups worth doing before production

- The frontend currently depends on Next.js 14.2.x; a couple of npm audit advisories only have fixes in Next 16 (a breaking major upgrade) — worth planning for.
- Add HTTPS + a reverse proxy (Nginx/Caddy) in front of both services.
- Swap SQLite for Postgres if you expect to add more workers/shops later — the SQLAlchemy models will work unchanged.
- Add Paystack webhook signature verification (see note above) before going live with real money.
