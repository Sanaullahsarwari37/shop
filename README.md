# Premium Local Shop Management System

Professional inventory + sales + debit (Nasiya) system for a single local shop.

**Stack (Sept 2026)**
- Frontend: React 19.3 · TypeScript 5.9 · Vite 8 · Tailwind CSS 4.3 · TanStack Query 5
- Backend: Node.js 20+ · Fastify 5.12 · TypeScript 5.9 · Drizzle ORM 0.45
- Database: PostgreSQL 16+
- Costing: Weighted Average Cost
- Debit: Full ledger (never overwrite balances)
- Localization: **English · Pashto · Dari** with full **RTL** support

---

## Features

- Products & categories with **auto-calculated** unit cost, selling value & profit
- Inventory with live cost/sale values & potential profit
- Purchases (stock-in) with weighted average cost update
- Cash sales + Debit sales (Nasiya)
- Customer debit accounts + partial/full payments + full ledger history
- Dashboard (today’s sales/profit/debit, low-stock alerts)
- Daily / monthly reports
- Dark / Light mode
- Three-language UI with automatic RTL/LTR
- Fully local — no external cloud required

### Product auto-calculations

| Input | Example |
|-------|---------|
| Quantity | 12 |
| Total Purchase Cost | 100 AFN |
| Selling Price / unit | 10 AFN |

System calculates:

- Cost per unit = `100 ÷ 12 ≈ 8.33 AFN`
- Total selling value = `12 × 10 = 120 AFN`
- Total expected profit = `120 − 100 = 20 AFN`

Profit on real sales uses **weighted average cost (COGS)** at sale time.

---

## Prerequisites

- **Node.js 20+**
- **PostgreSQL 16+** running locally

---

## Quick Start (Windows / macOS / Linux)

### 1. Create PostgreSQL user & database

Open a terminal and connect as the postgres superuser:

```bash
psql -U postgres
```

Paste:

```sql
CREATE USER shop WITH PASSWORD 'shop123';
CREATE DATABASE shop_management OWNER shop;
\c shop_management
GRANT ALL ON SCHEMA public TO shop;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO shop;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO shop;
\q
```

**Windows tip:** if `psql` is not in PATH:

```bash
"/c/Program Files/PostgreSQL/16/bin/psql.exe" -U postgres
```

(Use your installed version folder: 15, 16, or 17.)

Alternatively:

```bash
psql -U postgres -f scripts/init-db.sql
psql -U postgres -d shop_management -c "GRANT ALL ON SCHEMA public TO shop;"
```

### 2. Backend

```bash
cd backend
npm install
npx drizzle-kit push
npm run db:seed
npm run dev
```

API: http://localhost:3001  
Health: http://localhost:3001/api/health

### 3. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

Switch language with the **globe icon** in the top bar (English / پښتو / دری). RTL layout activates automatically for Pashto and Dari.

---

## Configuration

`backend/.env`:

```env
DATABASE_URL=postgres://shop:shop123@localhost:5432/shop_management
PORT=3001
NODE_ENV=development
ADMIN_PASSWORD=admin123
CURRENCY=AFN
CURRENCY_SYMBOL=؋
```

Change password or host in both `.env` and the `CREATE USER` step if needed.

---

## Architecture notes

- Stock movements and financial operations run inside **PostgreSQL transactions**
- Customer outstanding balance is a cached column kept in sync with the ledger
- Profit = Revenue − COGS (weighted average cost at time of sale)
- Localization is a lightweight custom i18n layer (no heavy runtime dependency)
- Uses current Sept 2026 package versions:
  - `drizzle-kit` with `dialect: "postgresql"`
  - `postgres` (postgres.js) + `drizzle-orm/postgres-js`
  - Fastify 5 + `@fastify/cors` v10

---

## Default data

After `npm run db:seed` you get sample categories, products, and one customer for testing.

Currency defaults to **AFN (؋)**.

No login required in v1 (single local shop user).

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `database "shop_management" does not exist` | Run the SQL in step 1 |
| `password authentication failed for user "shop"` | Recreate user or update `DATABASE_URL` password |
| `connection refused` | Start PostgreSQL service (Services app on Windows, or `pg_ctl`) |
| Frontend can’t reach API | Ensure backend is on port 3001; Vite proxies `/api` automatically |

---

## Project structure

```
shop-management/
├── backend/          # Fastify API + Drizzle + PostgreSQL
├── frontend/         # React + Vite + Tailwind + i18n
├── scripts/          # DB init SQL
└── README.md
```
