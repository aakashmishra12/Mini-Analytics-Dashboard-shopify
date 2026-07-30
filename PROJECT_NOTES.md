# Project Notes

Written for whoever reviews this. The README covers installation and the API
reference lives in `API.md`, so this file sticks to two things: what I picked
and why, and what actually works right now.

---

## The stack

**Backend — Node 24 + Express 4.**

No ORM and no database beyond a SQLite file. The assignment listed a database
as optional, and for this workload a real one would be dead weight: nothing
here is user-generated, and every value on screen is a projection of what
Shopify already owns. What the app genuinely needs is a cache, so that is what
I built. `better-sqlite3` writes one snapshot row that survives a restart, with
a 15 minute TTL and a manual override on the refresh button.

**Frontend — React 18 + Vite, Tailwind 3, Recharts.**

Vite for the dev server speed. Tailwind because the whole UI is one page and
maintaining a parallel stylesheet for a single page is busywork. Recharts is
the one dependency I went back and forth on. It ships a lot of code for two
charts, and the bundle warning in the build output is entirely its fault. I
kept it because writing responsive SVG charts by hand would have cost more time
than it saved, and the charts were a bonus item worth having.

**Tests — the built-in `node:test` runner.**

19 tests, no Jest, no Vitest, no config file. Node has had a test runner since
18 and the aggregation logic is pure functions, so there was nothing to mock.
Run them with `npm test`.

Full dependency list, backend and frontend combined: express, cors, morgan,
dotenv, better-sqlite3, react, react-dom, recharts. Everything else is a dev
dependency.

## How the Shopify integration is wired

The part I spent the most thought on. There are two providers behind one
interface:

```
backend/services/
  shopify.provider.js   Admin GraphQL API
  mock.provider.js      seeded catalogue, same shape
  store.service.js      picks one, caches the result
```

Both return the same normalised objects, so nothing above `store.service.js`
knows or cares where the data came from. Controllers, aggregation helpers and
the entire frontend are identical in both modes. The switch is
`USE_MOCK_DATA` in `backend/.env`, and if Shopify credentials are missing the
app falls back to mock data on its own rather than erroring at boot.

That mattered for a practical reason: I could build and test the whole
dashboard before I had store credentials, and the demo still runs for anyone
who clones the repo without a Shopify account. The header shows a badge saying
which mode is active, so there is no ambiguity about what you are looking at.

Queries are GraphQL, not REST, as the spec preferred. Products, orders,
customers and collections are fetched with cursor pagination, then reduced
locally in `backend/utils/analytics.js`.

**On top sellers.** The Admin API has no "units sold" field on a product.
I derive it by summing line item quantities across fetched orders, grouped by
product ID, excluding fully refunded orders. That is an honest approximation
over the order window rather than a lifetime figure, and it is the same method
Shopify's own reporting uses.

## What is working

Verified against a live store, `purple-beauty-zvme6kjr.myshopify.com`, on
30 July 2026. Current contents: 17 products, 4 orders, 6 customers,
3 collections, $9,534.55 revenue.

Everything in the required spec is done:

| Requirement | Status |
| --- | --- |
| KPI cards (products, orders, customers, collections) | Working, live |
| Latest 10 orders with all six fields | Working, live |
| Top 5 selling products with image and quantity | Working, derived from line items |
| Low inventory under 10, highlighted under 5 | Working, live |
| Search across products and orders | Working, debounced 300ms |
| Refresh button | Working, bypasses cache |
| `GET /api/dashboard` `/orders` `/products` `/inventory` | Working |
| `POST /api/refresh` | Working |
| Loading, empty and error states | All three, per section |
| Mobile responsive | Tables scroll horizontally under 640px |

The spec asked for any two bonus items. Six are in:

- Charts — orders by day (14 day line) and inventory distribution (bar)
- Dark mode — system preference on first load, toggle persists to localStorage
- Skeleton loading — per section, matching the real layout
- CSV export — `GET /api/orders/export`, respects the active search filter
- Pagination — server side on orders and products
- Response caching — SQLite, 15 minute TTL

Not done: date range filter, and authentication. Both were on the optional
list. Auth in particular felt wrong to bolt on without knowing who the users
would be.

## One thing worth flagging

The low inventory table was wrong when I first pointed it at a real store, and
the mock data could never have caught it.

Shopify returns `inventoryQuantity: 0` for two situations that are not
stockouts. Variants it does not track, like made-to-order goods, and gift
cards, which are generated at purchase and never restocked. On the dev store
this filled the table with six rows where only one was a real stockout: four
gift card denominations and one untracked product.

The fix needed two separate checks, which is the part that caught me out. Gift
cards still report `tracked: true`, so filtering on the tracked flag alone
removes the made-to-order product and leaves every gift card in place. Both
conditions now live in one guard in `analytics.js` shared by the table and the
distribution chart, so the two cannot drift apart and disagree. Four tests
cover it, and the seeded catalogue now includes a gift card and a made-to-order
product so the mock path exercises the same code.

I mention it because it is the kind of thing that only shows up against real
data, and I would rather show the bug and the fix than pretend the first
version was right.

## Folder structure

Matches the layout in the brief:

```
frontend/src/{components,pages,services}    backend/{routes,controllers,services,middleware,utils}
README.md    .env.example    package.json
```

The additions are `frontend/src/{context,hooks,utils}`, and `backend/{config,data,scripts,tests}`.
Root is an npm workspace so one `npm install` and one `npm run dev` covers both
halves.

## If I kept going

The bundle is bigger than it should be, and Recharts is most of that. Code
splitting the charts behind a dynamic import would fix the build warning.

Caching is all or nothing right now, one snapshot for the whole store. Per
resource TTLs would let inventory refresh more often than the collection count,
which almost never changes.

And the orders window is whatever the API returns rather than an explicit
range, which is fine at this size but would need real pagination strategy on a
store doing thousands of orders a week.
