const dayKey = (isoDate) => new Date(isoDate).toISOString().slice(0, 10);

/**
 * Shopify has no "units sold per product" field on the Admin API, so top
 * sellers are derived by summing line-item quantities across fetched orders.
 */
export function topSellingProducts(orders, limit = 5) {
  const totals = new Map();

  for (const order of orders) {
    if (order.paymentStatus === 'REFUNDED') continue;

    for (const item of order.lineItems) {
      const key = item.productId || item.title;
      const existing = totals.get(key);
      if (existing) {
        existing.quantitySold += item.quantity;
        existing.revenue += item.quantity * item.price;
      } else {
        totals.set(key, {
          productId: item.productId,
          title: item.title,
          sku: item.sku,
          image: item.image,
          quantitySold: item.quantity,
          revenue: item.quantity * item.price,
        });
      }
    }
  }

  return [...totals.values()]
    .map((p) => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }))
    .sort((a, b) => b.quantitySold - a.quantitySold || a.title.localeCompare(b.title))
    .slice(0, limit);
}

/**
 * Two kinds of variant report a quantity of 0 without actually being out of
 * stock, and both must stay out of stock reporting:
 *   - untracked variants (made-to-order), where Shopify keeps no count
 *   - gift cards, which are generated at purchase and never restocked;
 *     note these still report tracked: true, so the flag alone misses them
 * An absent flag means tracked, so mock and partial fixtures behave sensibly.
 */
const holdsStock = (product, variant) => variant.tracked !== false && !product.isGiftCard;

export function lowInventoryVariants(products, { threshold = 10, criticalThreshold = 5 } = {}) {
  const rows = [];

  for (const product of products) {
    for (const variant of product.variants) {
      if (!holdsStock(product, variant)) continue;
      if (variant.inventoryQuantity >= threshold) continue;
      rows.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.title,
        variantTitle: variant.title === 'Default Title' ? null : variant.title,
        sku: variant.sku,
        image: product.image,
        inventory: variant.inventoryQuantity,
        critical: variant.inventoryQuantity < criticalThreshold,
      });
    }
  }

  return rows.sort((a, b) => a.inventory - b.inventory || a.productName.localeCompare(b.productName));
}

/** Buckets orders into a continuous day series so the chart has no gaps. */
export function ordersByDay(orders, days = 14) {
  const buckets = new Map();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    buckets.set(date, { date, orders: 0, revenue: 0 });
  }

  for (const order of orders) {
    const bucket = buckets.get(dayKey(order.createdAt));
    if (!bucket) continue;
    bucket.orders += 1;
    bucket.revenue += order.totalAmount;
  }

  return [...buckets.values()].map((b) => ({ ...b, revenue: Math.round(b.revenue * 100) / 100 }));
}

/**
 * Three buckets, not four: a red/amber/green ramp is the widest set that stays
 * distinguishable under colour-vision deficiency, so "out of stock" folds into
 * critical for the chart and is reported separately as its own figure.
 */
export function inventoryDistribution(products, { threshold = 10, criticalThreshold = 5 } = {}) {
  const buckets = { critical: 0, low: 0, healthy: 0 };
  let outOfStock = 0;

  for (const product of products) {
    for (const variant of product.variants) {
      if (!holdsStock(product, variant)) continue;
      const qty = variant.inventoryQuantity;
      if (qty <= 0) outOfStock += 1;
      if (qty < criticalThreshold) buckets.critical += 1;
      else if (qty < threshold) buckets.low += 1;
      else buckets.healthy += 1;
    }
  }

  return {
    outOfStock,
    buckets: [
      { bucket: 'Critical', range: `0–${criticalThreshold - 1}`, count: buckets.critical, severity: 'critical' },
      { bucket: 'Low', range: `${criticalThreshold}–${threshold - 1}`, count: buckets.low, severity: 'low' },
      { bucket: 'Healthy', range: `${threshold}+`, count: buckets.healthy, severity: 'healthy' },
    ],
  };
}

export function revenueTotals(orders) {
  const paid = orders.filter((o) => o.paymentStatus === 'PAID' || o.paymentStatus === 'PARTIALLY_REFUNDED');
  const total = paid.reduce((sum, o) => sum + o.totalAmount, 0);

  return {
    totalRevenue: Math.round(total * 100) / 100,
    averageOrderValue: paid.length ? Math.round((total / paid.length) * 100) / 100 : 0,
    currency: orders[0]?.currency || 'USD',
  };
}

export function searchOrders(orders, term) {
  if (!term) return orders;
  const q = term.toLowerCase().trim();
  return orders.filter(
    (o) =>
      o.name.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      o.paymentStatus.toLowerCase().includes(q) ||
      o.fulfillmentStatus.toLowerCase().includes(q) ||
      o.lineItems.some((li) => li.title.toLowerCase().includes(q))
  );
}

export function searchProducts(products, term) {
  if (!term) return products;
  const q = term.toLowerCase().trim();
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.vendor.toLowerCase().includes(q) ||
      p.productType.toLowerCase().includes(q) ||
      p.variants.some((v) => (v.sku || '').toLowerCase().includes(q))
  );
}

export function paginate(items, page = 1, limit = 10) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 250);
  const totalItems = items.length;
  const totalPages = Math.max(Math.ceil(totalItems / safeLimit), 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (safePage - 1) * safeLimit;

  return {
    items: items.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
}
