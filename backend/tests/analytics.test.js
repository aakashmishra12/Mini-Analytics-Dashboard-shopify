import test from 'node:test';
import assert from 'node:assert/strict';
import {
  topSellingProducts,
  lowInventoryVariants,
  ordersByDay,
  inventoryDistribution,
  revenueTotals,
  searchOrders,
  paginate,
} from '../utils/analytics.js';

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const order = (overrides = {}) => ({
  id: 'gid://shopify/Order/1',
  name: '#1001',
  customerName: 'Priya Sharma',
  customerEmail: 'priya@example.com',
  totalAmount: 100,
  currency: 'USD',
  paymentStatus: 'PAID',
  fulfillmentStatus: 'FULFILLED',
  createdAt: daysAgo(1),
  lineItems: [],
  ...overrides,
});

const lineItem = (productId, quantity, price = 10, title = productId) => ({
  productId,
  title,
  sku: `${productId}-SKU`,
  image: null,
  quantity,
  price,
});

test('topSellingProducts sums quantities across orders and ranks descending', () => {
  const orders = [
    order({ lineItems: [lineItem('p1', 2), lineItem('p2', 5)] }),
    order({ lineItems: [lineItem('p1', 4), lineItem('p3', 1)] }),
  ];

  const result = topSellingProducts(orders);

  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((r) => [r.productId, r.quantitySold]),
    [['p1', 6], ['p2', 5], ['p3', 1]]
  );
});

test('topSellingProducts excludes fully refunded orders and honours the limit', () => {
  const orders = [
    order({ lineItems: [lineItem('p1', 2)] }),
    order({ paymentStatus: 'REFUNDED', lineItems: [lineItem('p1', 99)] }),
    order({ lineItems: [lineItem('p2', 1)] }),
  ];

  const result = topSellingProducts(orders, 1);

  assert.equal(result.length, 1);
  assert.equal(result[0].quantitySold, 2);
});

test('topSellingProducts accumulates revenue per product', () => {
  const orders = [order({ lineItems: [lineItem('p1', 3, 19.99)] })];

  assert.equal(topSellingProducts(orders)[0].revenue, 59.97);
});

const product = (title, variants) => ({
  id: `gid://${title}`,
  title,
  image: null,
  variants: variants.map((v, i) => ({
    id: `${title}-v${i}`,
    title: v.title ?? 'Default Title',
    sku: v.sku ?? `${title}-${i}`,
    price: 10,
    inventoryQuantity: v.qty,
    ...(v.tracked === undefined ? {} : { tracked: v.tracked }),
  })),
});

test('lowInventoryVariants returns only variants under the threshold, sorted ascending', () => {
  const products = [
    product('Alpha', [{ qty: 12 }]),
    product('Beta', [{ qty: 9 }]),
    product('Gamma', [{ qty: 2 }]),
  ];

  const rows = lowInventoryVariants(products);

  assert.deepEqual(rows.map((r) => r.productName), ['Gamma', 'Beta']);
});

test('lowInventoryVariants flags stock below the critical threshold', () => {
  const products = [product('Alpha', [{ qty: 4 }, { qty: 5 }, { qty: 0 }])];

  const rows = lowInventoryVariants(products);

  assert.deepEqual(rows.map((r) => [r.inventory, r.critical]), [[0, true], [4, true], [5, false]]);
});

test('lowInventoryVariants ignores variants Shopify does not track', () => {
  const products = [
    product('Made to Order', [{ qty: 0, tracked: false }]),
    product('Serum', [{ qty: 2, tracked: true }]),
  ];

  const rows = lowInventoryVariants(products);

  assert.deepEqual(rows.map((r) => r.productName), ['Serum']);
});

// Gift cards report tracked: true, so they need excluding on their own flag.
test('lowInventoryVariants ignores gift cards despite them reporting as tracked', () => {
  const giftCard = { ...product('Gift Card', [{ qty: 0, tracked: true }]), isGiftCard: true };
  const products = [giftCard, product('Serum', [{ qty: 2 }])];

  const rows = lowInventoryVariants(products);

  assert.deepEqual(rows.map((r) => r.productName), ['Serum']);
});

test('lowInventoryVariants treats a missing tracked flag as tracked', () => {
  const products = [product('Serum', [{ qty: 1 }])];

  assert.equal(lowInventoryVariants(products).length, 1);
});

test('inventoryDistribution excludes untracked variants and gift cards from every bucket', () => {
  const giftCard = { ...product('Gift Card', [{ qty: 0 }, { qty: 0 }]), isGiftCard: true };
  const products = [
    giftCard,
    product('Made to Order', [{ qty: 0, tracked: false }]),
    product('Serum', [{ qty: 2 }, { qty: 40 }]),
  ];

  const { buckets, outOfStock } = inventoryDistribution(products);
  const counts = Object.fromEntries(buckets.map((b) => [b.bucket, b.count]));

  assert.equal(outOfStock, 0);
  assert.deepEqual(counts, { Critical: 1, Low: 0, Healthy: 1 });
});

test('lowInventoryVariants respects custom thresholds', () => {
  const products = [product('Alpha', [{ qty: 25 }, { qty: 60 }])];

  const rows = lowInventoryVariants(products, { threshold: 50, criticalThreshold: 30 });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].critical, true);
});

test('ordersByDay produces a gapless series of the requested length', () => {
  const series = ordersByDay([], 14);

  assert.equal(series.length, 14);
  const dates = series.map((s) => s.date);
  assert.deepEqual([...dates].sort(), dates);
});

test('ordersByDay buckets orders into the correct day and sums revenue', () => {
  const orders = [
    order({ createdAt: daysAgo(0), totalAmount: 50 }),
    order({ createdAt: daysAgo(0), totalAmount: 25 }),
    order({ createdAt: daysAgo(3), totalAmount: 10 }),
  ];

  const series = ordersByDay(orders, 7);
  const today = series.at(-1);

  assert.equal(today.orders, 2);
  assert.equal(today.revenue, 75);
  assert.equal(series.at(-4).orders, 1);
});

test('ordersByDay ignores orders outside the window', () => {
  const series = ordersByDay([order({ createdAt: daysAgo(60) })], 14);

  assert.equal(series.reduce((sum, s) => sum + s.orders, 0), 0);
});

test('inventoryDistribution buckets variants by stock health', () => {
  const products = [product('Alpha', [{ qty: 0 }, { qty: 3 }, { qty: 7 }, { qty: 40 }])];

  const { buckets, outOfStock } = inventoryDistribution(products);

  assert.equal(outOfStock, 1);
  assert.deepEqual(
    Object.fromEntries(buckets.map((b) => [b.bucket, b.count])),
    { Critical: 2, Low: 1, Healthy: 1 }
  );
});

test('inventoryDistribution counts out-of-stock inside the critical bucket', () => {
  const products = [product('Alpha', [{ qty: 0 }, { qty: 0 }])];

  const { buckets, outOfStock } = inventoryDistribution(products);

  assert.equal(outOfStock, 2);
  assert.equal(buckets.find((b) => b.bucket === 'Critical').count, 2);
});

test('revenueTotals excludes unpaid orders from the average', () => {
  const orders = [
    order({ totalAmount: 100 }),
    order({ totalAmount: 200 }),
    order({ totalAmount: 999, paymentStatus: 'PENDING' }),
  ];

  const totals = revenueTotals(orders);

  assert.equal(totals.totalRevenue, 300);
  assert.equal(totals.averageOrderValue, 150);
});

test('searchOrders matches order number, customer, status and line item title', () => {
  const orders = [
    order({ name: '#1001', customerName: 'Priya Sharma', lineItems: [lineItem('p1', 1, 10, 'Silk Sleep Mask')] }),
    order({ name: '#1002', customerName: 'Marcus Bell', paymentStatus: 'REFUNDED' }),
  ];

  assert.equal(searchOrders(orders, '1001').length, 1);
  assert.equal(searchOrders(orders, 'marcus').length, 1);
  assert.equal(searchOrders(orders, 'refunded').length, 1);
  assert.equal(searchOrders(orders, 'silk').length, 1);
  assert.equal(searchOrders(orders, '').length, 2);
});

test('paginate clamps out-of-range pages to the last page', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  const { items: page, pagination } = paginate(items, 99, 10);

  assert.equal(pagination.page, 3);
  assert.equal(pagination.totalPages, 3);
  assert.equal(page.length, 5);
  assert.equal(pagination.hasNextPage, false);
  assert.equal(pagination.hasPreviousPage, true);
});

test('paginate returns a valid empty page when there are no items', () => {
  const { items, pagination } = paginate([], 1, 10);

  assert.deepEqual(items, []);
  assert.equal(pagination.totalPages, 1);
  assert.equal(pagination.totalItems, 0);
});
