#!/usr/bin/env node
/**
 * Verifies Shopify credentials before you flip USE_MOCK_DATA=false.
 * Reports which scopes are working and what the dashboard would show.
 *
 *   npm run check:shopify -w backend
 */
import { config } from '../config/index.js';

const { domain, accessToken, apiVersion } = config.shopify;

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

if (!domain || !accessToken) {
  console.error(`\n${red('✗')} Missing credentials.\n`);
  console.error('  Set these in backend/.env:');
  console.error('    SHOPIFY_STORE_DOMAIN=your-store.myshopify.com');
  console.error('    SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...\n');
  process.exit(1);
}

if (!/^[a-z0-9-]+\.myshopify\.com$/i.test(domain)) {
  console.error(`\n${red('✗')} SHOPIFY_STORE_DOMAIN looks wrong: ${bold(domain)}`);
  console.error(`  Expected the ${bold('admin')} domain, e.g. ${green('your-store.myshopify.com')}`);
  console.error('  (not your public storefront domain, and no https:// prefix)\n');
  process.exit(1);
}

const endpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

async function query(name, gql) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify({ query: gql }),
    });

    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'token rejected' };
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

    const body = await res.json();
    if (body.errors?.length) {
      const msg = body.errors[0].message;
      const missingScope = /access denied|not approved|required access/i.test(msg);
      return { ok: false, reason: missingScope ? 'missing scope' : msg.slice(0, 70) };
    }
    return { ok: true, data: body.data };
  } catch (error) {
    return { ok: false, reason: `network: ${error.message}` };
  }
}

console.log(`\n  ${bold('Shopify connection check')}`);
console.log(`  ${dim(endpoint)}\n`);

const shop = await query('shop', '{ shop { name myshopifyDomain plan { displayName } } }');

if (!shop.ok) {
  console.log(`  ${red('✗')} Could not authenticate — ${shop.reason}\n`);
  if (shop.reason === 'token rejected') {
    console.log('  Fix: the token is wrong, revoked, or belongs to a different store.');
    console.log('  Shopify Admin → Settings → Apps and sales channels → Develop apps');
    console.log('    → your app → API credentials → Admin API access token\n');
  }
  process.exit(1);
}

console.log(`  ${green('✓')} Connected to ${bold(shop.data.shop.name)}`);
console.log(`    ${dim(`${shop.data.shop.myshopifyDomain} · ${shop.data.shop.plan?.displayName ?? 'unknown plan'}`)}\n`);

const checks = [
  ['read_products', 'Products & inventory', '{ productsCount { count } }', (d) => `${d.productsCount.count} products`],
  ['read_orders', 'Orders', '{ ordersCount { count } }', (d) => `${d.ordersCount.count} orders`],
  ['read_customers', 'Customers', '{ customersCount { count } }', (d) => `${d.customersCount.count} customers`],
  ['read_products', 'Collections', '{ collectionsCount { count } }', (d) => `${d.collectionsCount.count} collections`],
];

let failures = 0;

for (const [scope, label, gql, describe] of checks) {
  const result = await query(label, gql);
  if (result.ok) {
    console.log(`  ${green('✓')} ${label.padEnd(22)} ${dim(describe(result.data))}`);
  } else {
    failures += 1;
    console.log(`  ${red('✗')} ${label.padEnd(22)} ${red(result.reason)}  ${dim(`needs ${scope}`)}`);
  }
}

// Line items drive the "top selling products" ranking.
const lineItems = await query(
  'lineItems',
  '{ orders(first: 1, sortKey: CREATED_AT, reverse: true) { nodes { name lineItems(first: 1) { nodes { quantity } } } } }'
);

if (lineItems.ok) {
  const order = lineItems.data.orders.nodes[0];
  console.log(
    `  ${green('✓')} ${'Order line items'.padEnd(22)} ${dim(order ? `latest: ${order.name}` : 'no orders yet')}`
  );
} else {
  failures += 1;
  console.log(`  ${red('✗')} ${'Order line items'.padEnd(22)} ${red(lineItems.reason)}  ${dim('needs read_orders')}`);
}

if (failures) {
  console.log(`\n  ${red(`${failures} check(s) failed.`)} Add the missing scopes:`);
  console.log('  Develop apps → your app → Configuration → Admin API integration → Configure');
  console.log(`  ${dim('Then reinstall the app — scope changes need a reinstall to take effect.')}\n`);
  process.exit(1);
}

console.log(`\n  ${green('All checks passed.')} Set ${bold('USE_MOCK_DATA=false')} in backend/.env and restart.\n`);
