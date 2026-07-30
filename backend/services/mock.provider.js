import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { placeholderImage } from '../utils/placeholderImage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'catalog.json'), 'utf8'));

/** Deterministic PRNG so the demo store looks identical on every boot. */
function makeRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

const PAYMENT_STATUSES = ['PAID', 'PAID', 'PAID', 'PAID', 'PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED'];
const FULFILLMENT_STATUSES = ['FULFILLED', 'FULFILLED', 'FULFILLED', 'UNFULFILLED', 'UNFULFILLED', 'PARTIALLY_FULFILLED'];

const ORDER_COUNT = 146;
const ORDER_WINDOW_DAYS = 30;

function buildProducts() {
  return catalog.products.map((p, index) => {
    const handle = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return {
      id: `gid://shopify/Product/${8000000000 + index}`,
      title: p.title,
      handle,
      status: 'ACTIVE',
      vendor: p.vendor,
      productType: p.type,
      image: placeholderImage(p.title),
      totalInventory: p.inventory,
      price: p.price,
      variants: [
        {
          id: `gid://shopify/ProductVariant/${9000000000 + index}`,
          title: 'Default Title',
          sku: p.sku,
          price: p.price,
          inventoryQuantity: p.inventory,
        },
      ],
    };
  });
}

function buildCustomers(rand) {
  return catalog.customers.map((c, index) => ({
    id: `gid://shopify/Customer/${7000000000 + index}`,
    name: `${c.firstName} ${c.lastName}`,
    email: c.email,
    ordersCount: 1 + Math.floor(rand() * 6),
    totalSpent: Math.round((60 + rand() * 900) * 100) / 100,
    createdAt: new Date(Date.now() - Math.floor(rand() * 400) * 86400000).toISOString(),
  }));
}

function buildCollections(products) {
  return catalog.collections.map((c, index) => ({
    id: `gid://shopify/Collection/${6000000000 + index}`,
    title: c.title,
    handle: c.handle,
    productsCount: 4 + ((products.length + index * 3) % 11),
  }));
}

function buildOrders(rand, products, customers) {
  const orders = [];

  for (let i = 0; i < ORDER_COUNT; i += 1) {
    const customer = pick(rand, customers);
    const daysAgo = Math.floor(rand() * ORDER_WINDOW_DAYS);
    const createdAt = new Date(
      Date.now() - daysAgo * 86400000 - Math.floor(rand() * 86400000)
    ).toISOString();

    const lineItemCount = 1 + Math.floor(rand() * 3);
    const lineItems = [];
    let subtotal = 0;

    for (let j = 0; j < lineItemCount; j += 1) {
      // Mildly weight the front of the catalog so "top selling" has a clear
      // ranking without one runaway outlier.
      const weighted = Math.floor(rand() ** 1.35 * products.length);
      const product = products[weighted];
      if (lineItems.some((li) => li.productId === product.id)) continue;

      const quantity = 1 + Math.floor(rand() * 3);
      subtotal += product.price * quantity;
      lineItems.push({
        productId: product.id,
        title: product.title,
        sku: product.variants[0].sku,
        image: product.image,
        quantity,
        price: product.price,
      });
    }

    const paymentStatus = pick(rand, PAYMENT_STATUSES);
    const fulfillmentStatus =
      paymentStatus === 'PENDING' ? 'UNFULFILLED' : pick(rand, FULFILLMENT_STATUSES);

    orders.push({
      id: `gid://shopify/Order/${5000000000 + i}`,
      name: `#${1001 + i}`,
      customerName: customer.name,
      customerEmail: customer.email,
      totalAmount: Math.round(subtotal * 100) / 100,
      currency: 'USD',
      paymentStatus,
      fulfillmentStatus,
      createdAt,
      lineItems,
    });
  }

  return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function fetchStoreSnapshot() {
  const rand = makeRandom(20260730);
  const products = buildProducts();
  const customers = buildCustomers(rand);
  const collections = buildCollections(products);
  const orders = buildOrders(rand, products, customers);

  return {
    shopName: 'Northwind Goods (Demo Store)',
    products,
    orders,
    customers,
    collections,
    counts: {
      products: products.length,
      orders: orders.length,
      customers: customers.length,
      collections: collections.length,
    },
    fetchedAt: new Date().toISOString(),
  };
}
