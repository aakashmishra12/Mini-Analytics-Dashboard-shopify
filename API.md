# API Reference

Base URL (local): `http://localhost:4000/api`

All responses are JSON. Successful responses wrap the payload in `data`; list
endpoints add `pagination`, and every store-backed endpoint adds `meta`.

---

## Conventions

### Envelope

```jsonc
{
  "data":       …,          // the payload — object or array
  "pagination": { … },      // list endpoints only
  "summary":    { … },      // /inventory only
  "meta":       { … }       // cache + data-source info
}
```

### `meta`

Present on every endpoint that reads store data.

| Field | Type | Meaning |
|---|---|---|
| `dataSource` | `"shopify"` \| `"mock"` | Which provider served the snapshot |
| `cached` | boolean | Served from the SQLite cache rather than a fresh fetch |
| `stale` | boolean | A refetch failed and cached data was served instead |
| `lastUpdated` | ISO 8601 | When the underlying snapshot was fetched |
| `cacheTtlMinutes` | number | How long a snapshot stays fresh |

### `pagination`

| Field | Type |
|---|---|
| `page` | number — clamped to the valid range |
| `limit` | number — 1–250 |
| `totalItems` | number |
| `totalPages` | number — at least 1 |
| `hasNextPage` | boolean |
| `hasPreviousPage` | boolean |

### Errors

```json
{ "error": { "message": "Route GET /api/nope not found", "code": "NOT_FOUND" } }
```

| Status | Code | When |
|---|---|---|
| `404` | `NOT_FOUND` | Unknown route |
| `502` | `SHOPIFY_AUTH_FAILED` | Token rejected — check the token and its scopes |
| `502` | `SHOPIFY_HTTP_ERROR` | Shopify returned a non-2xx response |
| `502` | `SHOPIFY_GRAPHQL_ERROR` | Shopify returned GraphQL errors |
| `500` | `INTERNAL_ERROR` | Unhandled server error |

### Statuses

Shopify enums are passed through unchanged.

- **Payment** — `PAID`, `PENDING`, `REFUNDED`, `PARTIALLY_REFUNDED`, `AUTHORIZED`, `VOIDED`
- **Fulfillment** — `FULFILLED`, `UNFULFILLED`, `PARTIALLY_FULFILLED`, `IN_PROGRESS`, `RESTOCKED`

---

## `GET /api/dashboard`

Everything the dashboard's top half needs, in one call: KPIs, revenue, both charts,
and the top 5 products.

**Example**

```bash
curl http://localhost:4000/api/dashboard
```

```jsonc
{
  "data": {
    "shopName": "Northwind Goods (Demo Store)",
    "kpis": {
      "totalProducts": 40,
      "totalOrders": 146,
      "totalCustomers": 25,
      "totalCollections": 5
    },
    "revenue": {
      "totalRevenue": 27213,
      "averageOrderValue": 256.73,
      "currency": "USD"
    },
    "lowStockCount": 17,
    "criticalStockCount": 8,
    "charts": {
      "ordersByDay": [
        { "date": "2026-07-17", "orders": 2, "revenue": 799 }
        // …14 entries, oldest first, gaps filled with zeroes
      ],
      "inventoryDistribution": {
        "outOfStock": 1,
        "buckets": [
          { "bucket": "Critical", "range": "0–4",  "count": 8,  "severity": "critical" },
          { "bucket": "Low",      "range": "5–9",  "count": 9,  "severity": "low" },
          { "bucket": "Healthy",  "range": "10+",  "count": 23, "severity": "healthy" }
        ]
      }
    },
    "topProducts": [
      {
        "productId": "gid://shopify/Product/8000000000",
        "title": "Aurora Hydrating Serum",
        "sku": "AUR-SER-30",
        "image": "https://cdn.shopify.com/…",
        "quantitySold": 50,
        "revenue": 2400
      }
      // …5 total
    ],
    "meta": { "dataSource": "mock", "cached": false, "stale": false,
              "lastUpdated": "2026-07-30T08:14:31.224Z", "cacheTtlMinutes": 15 }
  }
}
```

**Notes**

- `revenue` counts only orders in a paid state; refunded and pending orders are excluded from the average.
- `ordersByDay` always returns exactly 14 consecutive days ending today, so the chart never has gaps.
- `inventoryDistribution` reports three buckets; `outOfStock` is counted separately **and** included in `Critical`.

---

## `GET /api/orders`

The latest orders, newest first.

| Query param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | Matches order number, customer name, email, either status, or a line-item product name |
| `page` | number | `1` | Clamped to the valid range |
| `limit` | number | `10` | 1–250 |

**Example**

```bash
curl "http://localhost:4000/api/orders?search=priya&page=1&limit=1"
```

```json
{
  "data": [
    {
      "id": "gid://shopify/Order/5000000117",
      "name": "#1118",
      "customerName": "Chloe Martin",
      "customerEmail": "chloe.martin@example.com",
      "totalAmount": 282,
      "currency": "USD",
      "paymentStatus": "PENDING",
      "fulfillmentStatus": "UNFULFILLED",
      "createdAt": "2026-07-30T07:52:24.537Z",
      "itemCount": 1
    }
  ],
  "pagination": {
    "page": 1, "limit": 1, "totalItems": 146, "totalPages": 146,
    "hasNextPage": true, "hasPreviousPage": false
  },
  "meta": { "dataSource": "mock", "cached": true, "stale": false,
            "lastUpdated": "2026-07-30T08:14:31.224Z", "cacheTtlMinutes": 15 }
}
```

Orders without a customer record report `customerName: "Guest checkout"`.

---

## `GET /api/orders/export`

Streams the **full filtered result set** as CSV — not just the current page.

| Query param | Type | Notes |
|---|---|---|
| `search` | string | Same matching rules as `/api/orders` |

**Example**

```bash
curl -OJ "http://localhost:4000/api/orders/export?search=priya"
```

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="orders-2026-07-30.csv"
```

```csv
Order Number,Customer,Email,Total,Currency,Payment Status,Fulfillment Status,Order Date
#1072,Priya Sharma,priya.sharma@example.com,312,USD,PAID,UNFULFILLED,2026-07-15T16:14:23.661Z
```

Cells beginning with `=`, `+`, `-` or `@` are prefixed with a quote to prevent
spreadsheet formula injection from store data.

---

## `GET /api/products`

| Query param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | Matches title, vendor, product type, or any variant SKU |
| `page` | number | `1` | |
| `limit` | number | `10` | 1–250 |

**Example**

```bash
curl "http://localhost:4000/api/products?search=serum"
```

```json
{
  "data": [
    {
      "id": "gid://shopify/Product/8000000000",
      "title": "Aurora Hydrating Serum",
      "handle": "aurora-hydrating-serum",
      "status": "ACTIVE",
      "vendor": "Lumen Labs",
      "productType": "Skincare",
      "image": "https://cdn.shopify.com/…",
      "totalInventory": 3,
      "price": 48,
      "variants": [
        {
          "id": "gid://shopify/ProductVariant/9000000000",
          "title": "Default Title",
          "sku": "AUR-SER-30",
          "price": 48,
          "inventoryQuantity": 3
        }
      ]
    }
  ],
  "pagination": { "page": 1, "limit": 10, "totalItems": 1, "totalPages": 1,
                  "hasNextPage": false, "hasPreviousPage": false },
  "meta": { "…": "…" }
}
```

---

## `GET /api/products/top-selling`

Top products by units sold, derived by summing line-item quantities across the
orders in the current snapshot. Fully refunded orders are excluded.

| Query param | Type | Default |
|---|---|---|
| `limit` | number | `5` |

```bash
curl http://localhost:4000/api/products/top-selling
```

```json
{
  "data": [
    {
      "productId": "gid://shopify/Product/8000000000",
      "title": "Aurora Hydrating Serum",
      "sku": "AUR-SER-30",
      "image": "https://cdn.shopify.com/…",
      "quantitySold": 50,
      "revenue": 2400
    }
  ],
  "meta": { "…": "…" }
}
```

> **Why it's computed this way.** The Shopify Admin API exposes no per-product
> "units sold" field. Ranking is therefore derived from order line items, which
> means it reflects the orders in the current snapshot rather than all-time sales.
> All-time figures require ShopifyQL or the Reports API.

---

## `GET /api/inventory`

Variants below the low-stock threshold, lowest stock first.

| Query param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | Matches product name or SKU |
| `page` | number | `1` | |
| `limit` | number | `10` | 1–250 |
| `threshold` | number | `10` | Overrides `LOW_INVENTORY_THRESHOLD` |
| `criticalThreshold` | number | `5` | Overrides `CRITICAL_INVENTORY_THRESHOLD` |

```bash
curl "http://localhost:4000/api/inventory?limit=1"
```

```json
{
  "data": [
    {
      "productId": "gid://shopify/Product/8000000024",
      "variantId": "gid://shopify/ProductVariant/9000000024",
      "productName": "Wool Blend Beanie",
      "variantTitle": null,
      "sku": "WOL-BNE-01",
      "image": null,
      "inventory": 0,
      "critical": true
    }
  ],
  "pagination": { "page": 1, "limit": 1, "totalItems": 17, "totalPages": 17,
                  "hasNextPage": true, "hasPreviousPage": false },
  "summary": { "threshold": 10, "criticalThreshold": 5, "lowCount": 17, "criticalCount": 8 },
  "meta": { "…": "…" }
}
```

`variantTitle` is `null` for single-variant products. `critical` is `true` when
`inventory < criticalThreshold` — the UI highlights those rows in red and the rest
in amber.

---

## `POST /api/refresh`

Clears the cache and refetches from the active data source, ignoring the TTL.

```bash
curl -X POST http://localhost:4000/api/refresh
```

```json
{
  "data": {
    "message": "Store data refreshed from source",
    "dataSource": "mock",
    "lastUpdated": "2026-07-30T08:14:31.224Z",
    "counts": { "products": 40, "orders": 146, "customers": 25, "collections": 5 }
  }
}
```

---

## `GET /api/health`

Unauthenticated health check, suitable for a platform health probe.

```bash
curl http://localhost:4000/api/health
```

```json
{
  "data": {
    "status": "ok",
    "uptimeSeconds": 639,
    "cache": { "populated": true, "isFresh": true, "lastUpdated": "2026-07-30T08:14:31.224Z" }
  }
}
```

---

## Caching behaviour

All read endpoints share **one cached store snapshot** keyed as `store:snapshot`
in SQLite, so rendering the whole dashboard costs at most one Shopify round-trip.

1. Within `CACHE_TTL_MINUTES` (default 15) the cached snapshot is served — `meta.cached: true`.
2. Once stale, the next request refetches and rewrites the cache.
3. If a refetch fails but a stale snapshot exists, the stale copy is served with
   `meta.stale: true` rather than returning an error.
4. `POST /api/refresh` bypasses the TTL entirely.

---

## Shopify GraphQL queries used

When `dataSource` is `shopify`, one snapshot fetch issues these queries in parallel
against `https://{shop}/admin/api/{version}/graphql.json`:

| Query | Fields | Feeds |
|---|---|---|
| `StoreCounts` | `shop.name`, `productsCount`, `ordersCount`, `customersCount`, `collectionsCount` | KPI cards |
| `Products` | `id`, `title`, `vendor`, `productType`, `totalInventory`, `featuredImage`, `variants{sku, inventoryQuantity, price}` | Products, inventory, distribution chart |
| `Orders` | `name`, `createdAt`, `displayFinancialStatus`, `displayFulfillmentStatus`, `currentTotalPriceSet`, `customer`, `lineItems{quantity, product}` | Orders table, top sellers, orders-by-day |
| `Customers` | `displayName`, `email`, `numberOfOrders`, `amountSpent` | Customer KPI |
| `Collections` | `title`, `handle`, `productsCount` | Collections KPI |

Cursor pagination is followed up to a page cap (products 5 pages, orders and
customers 3, collections 2) so a very large store cannot stall a single request.
