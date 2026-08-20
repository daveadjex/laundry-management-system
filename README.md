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
| Payments | Paystack Charge API — Mobile Money (MTN / Vodafone Cash / AirtelTigo) |
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
