# Mini Analytics Dashboard

A small full-stack analytics dashboard for a D2C Shopify brand. It pulls store data
from the **Shopify Admin GraphQL API**, caches it in the backend, and renders key
business metrics so the marketing team never has to open Shopify Admin.

Built with **React + Vite + Tailwind** on the front end and **Node + Express + SQLite**
on the back end.

> **Runs with zero setup.** With no Shopify credentials configured the app serves a
> realistic bundled demo store, so you can clone and run it immediately. Adding
> credentials switches it to live data with no code changes.

---

## Contents

- [Features](#features)
- [Screens](#screens)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Connecting a real Shopify store](#connecting-a-real-shopify-store)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Testing](#testing)
- [Deployment](#deployment)
- [Design notes](#design-notes)

---

## Features

### Required

| Requirement | Status |
|---|---|
| KPI cards — products, orders, customers, collections | Done |
| Latest 10 orders (number, customer, total, payment, fulfillment, date) | Done |
| Top 5 selling products (image, name, quantity sold) | Done |
| Low inventory (below 10) with SKU, highlighted below 5 | Done |
| Search across products and orders | Done |
| Refresh Data button | Done |
| Loading spinner, empty state, error state | Done |
| Mobile responsive layout | Done |

### Bonus (5 of the 8 optional items)

| Bonus | How it shows up |
|---|---|
| **Charts** | Orders by day (14-day bar chart) and inventory distribution by stock level |
| **Dark mode** | Toggle in the header, remembered across reloads, no flash on load |
| **Skeleton loading** | Per-section skeletons on refresh and pagination |
| **Export orders to CSV** | Export button on the orders table, honours the active search |
| **Pagination** | On the orders and inventory tables |
| **API response caching** | SQLite-backed snapshot cache with a TTL (also a core requirement) |

---

## Screens

The dashboard is a single responsive page:

- **Header** — store name, live/demo data badge, last-updated time, theme toggle, refresh
- **KPI row** — four metric cards with supporting context
- **Charts** — orders by day, inventory distribution
- **Latest orders** — searchable, paginated, CSV export, status badges
- **Top selling products** — ranked with images and units sold
- **Low inventory** — searchable, paginated, amber under 10, red under 5

---

## Tech stack

**Frontend** — React 18, Vite, Tailwind CSS, Recharts
**Backend** — Node.js, Express, better-sqlite3
**API** — Shopify Admin GraphQL API (`2025-01`)

---

## Quick start

**Requirements:** Node.js 18 or newer.

```bash
git clone <your-repo-url>
cd mini-analytics-dashboard

npm install                          # installs both workspaces

cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env

npm run dev                          # backend :4000 + frontend :5173
```

Open **http://localhost:5173**.

No Shopify credentials are needed — the app boots on the bundled demo store.

### Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs backend and frontend together |
| `npm run dev:backend` | Backend only, with watch reload |
| `npm run dev:frontend` | Frontend only |
| `npm test` | Backend unit tests |
| `npm run build` | Production build of the frontend |
| `npm start` | Runs the backend in production mode |

---

## Connecting a real Shopify store

You need a **custom app** access token. This takes about five minutes.

### 1. Get a store

Use an existing store, or create a free development store at
[partners.shopify.com](https://partners.shopify.com) → **Stores** → **Add store** →
**Create development store**. Pick "Start with test data" so it comes pre-populated
with products and orders.

### 2. Create a custom app

In **Shopify Admin**:

1. **Settings** → **Apps and sales channels**
2. Click **Develop apps** (enable app development if prompted)
3. **Create an app** → name it `Analytics Dashboard` → **Create app**

### 3. Grant the scopes

Open **Configuration** → **Admin API integration** → **Configure**, then enable:

| Scope | Used for |
|---|---|
| `read_products` | Products, variants, collections, inventory levels |
| `read_orders` | Latest orders, top sellers, orders-by-day |
| `read_customers` | Customer count |
| `read_inventory` | Inventory quantities |

Save.

> `read_orders` only returns the last 60 days of orders by default. For a full
> history, request `read_all_orders` from Shopify — not needed for this dashboard.

### 4. Install and copy the token

**API credentials** → **Install app** → reveal and copy the
**Admin API access token** (starts with `shpat_`). It is shown once.

### 5. Configure the backend

In `backend/.env`:

```env
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
USE_MOCK_DATA=false
```

Restart the backend. The header badge flips from **Demo data** to **Live Shopify data**.

> Never commit `.env`. It is already in `.gitignore`.

---

## Environment variables

### Backend

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `NODE_ENV` | `development` | Disables request logging when `test` |
| `CORS_ORIGIN` | `*` | Comma-separated allowed origins |
| `SHOPIFY_STORE_DOMAIN` | — | `your-store.myshopify.com` |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | — | Custom app token (`shpat_…`) |
| `SHOPIFY_API_VERSION` | `2025-01` | Admin API version |
| `USE_MOCK_DATA` | auto | `true` forces demo data; defaults to `true` when credentials are missing |
| `CACHE_TTL_MINUTES` | `15` | How long a snapshot stays fresh |
| `LOW_INVENTORY_THRESHOLD` | `10` | "Low stock" cutoff |
| `CRITICAL_INVENTORY_THRESHOLD` | `5` | "Critical stock" cutoff |

### Frontend

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | API base. Keep `/api` locally (Vite proxies it); set the full backend URL in production. |

---

## Project structure

```
mini-analytics-dashboard/
├── frontend/
│   └── src/
│       ├── components/      KPI cards, charts, tables, badges, states, skeletons
│       ├── pages/           Dashboard.jsx — composes every section
│       ├── services/        api.js — the single API client
│       ├── hooks/           useResource (fetch + state), useDebouncedValue
│       ├── context/         ThemeContext — dark mode
│       └── utils/           format.js — numbers, currency, dates
│
├── backend/
│   ├── routes/              Express route table
│   ├── controllers/         Request/response handling per resource
│   ├── services/            shopify.provider · mock.provider · store.service
│   ├── middleware/          errorHandler, ApiError, asyncHandler
│   ├── utils/               analytics.js (aggregation), cache.js, csv.js
│   ├── data/                catalog.json (demo seed) + cache.sqlite (generated)
│   └── tests/               Unit tests for the aggregation logic
│
├── README.md · API.md · DEPLOYMENT.md
└── .env.example
```

---

## How it works

### One snapshot, many endpoints

Every endpoint reads from a single cached **store snapshot** rather than calling
Shopify per request. A full dashboard load therefore costs **at most one** round-trip
to Shopify, and usually zero.

```
Request → controller → store.service.getSnapshot()
                            │
                            ├── fresh in SQLite?  → return cached
                            └── stale/missing     → provider.fetchStoreSnapshot()
                                                    → write to SQLite → return
```

`POST /api/refresh` clears the cache and forces a refetch. If a refetch fails but
stale data exists, the stale data is served rather than erroring — a dashboard
showing slightly old numbers beats one showing nothing.

### Swapping data sources

`mock.provider.js` and `shopify.provider.js` both export `fetchStoreSnapshot()` and
return the **same normalized shape**. `store.service.js` picks one based on config.
Nothing downstream — controllers, aggregation, or the entire frontend — knows or
cares which is active.

### Top selling products

The Shopify Admin API has no "units sold per product" field. Top sellers are derived
by **aggregating line-item quantities across fetched orders**: sum `quantity` per
product, drop fully refunded orders, sort descending, take the top 5. This is
computed in `topSellingProducts()` in `backend/utils/analytics.js` and is unit-tested.

The trade-off: the ranking covers the orders in the current snapshot (the most recent
few hundred), not all-time sales. For all-time figures you would use ShopifyQL or the
Reports API, both of which need a higher plan tier.

### Demo data

`backend/data/catalog.json` holds a hand-written 40-product catalogue with realistic
prices, SKUs and deliberately varied stock levels. Orders are generated at boot by a
**seeded** PRNG — identical on every run, but with dates anchored to today so the
14-day chart is always populated. Product images are inline SVG data URIs, so the
demo renders correctly with no network access.

### Frontend data flow

Each section owns its own fetch through the `useResource` hook, so one failing
endpoint degrades that card alone instead of blanking the page. Section-level error
boundaries catch render errors the same way. Only the very first load shows a
full-page spinner; subsequent loads keep the layout and swap in skeletons.

---

## Testing

```bash
npm test
```

15 unit tests covering the aggregation logic in `backend/utils/analytics.js` — top
sellers (including refund exclusion and revenue totals), the low-inventory filter and
critical flag, day bucketing with gap-filling, inventory distribution, revenue
averages, search matching, and pagination clamping.

The UI was verified in a real browser (Chromium via Playwright) across the golden
path and edge cases: all four sections populating, both charts rendering, search
filtering, the empty state, pagination, CSV download contents, refresh updating the
timestamp, dark-mode toggle and persistence across reload, a 375px mobile layout with
no horizontal overflow, and — with the backend stopped — every section falling back to
its error state with a working retry.

---

## Deployment

Deploys free on Render as a single service: `npm run build` produces the React
bundle and Express serves it alongside the API from one origin, so there is one
URL to share and no CORS to configure. The repo includes a `render.yaml`
blueprint. Splitting the frontend onto Vercel is also supported.

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for both paths.

---

## Design notes

The interface follows a Vercel-style visual language: near-black and white surfaces,
1px hairline borders, tight spacing, a single neutral grey scale, and colour reserved
almost entirely for status.

Chart colours were **validated rather than eyeballed**. The single-series blue passes
the lightness, chroma, colour-vision-deficiency and contrast checks against both the
light and dark surfaces. The inventory chart uses three buckets rather than four
because a four-hue red→green ramp cannot keep adjacent pairs distinguishable for
colour-blind readers; out-of-stock items are folded into "critical" in the chart and
surfaced as their own figure beside the title, so no information is lost. Every bar
carries a text label, so colour never carries meaning alone.

---

## API

Full endpoint reference with example payloads: **[API.md](./API.md)**.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/dashboard` | KPIs, revenue, chart data, top products |
| `GET` | `/api/orders` | Paginated, searchable orders |
| `GET` | `/api/orders/export` | CSV download |
| `GET` | `/api/products` | Paginated, searchable products |
| `GET` | `/api/products/top-selling` | Top 5 by units sold |
| `GET` | `/api/inventory` | Low stock variants |
| `POST` | `/api/refresh` | Force a refetch from Shopify |
| `GET` | `/api/health` | Health check |
