import { config } from '../config/index.js';
import { ApiError } from '../middleware/errorHandler.js';

const endpoint = () =>
  `https://${config.shopify.domain}/admin/api/${config.shopify.apiVersion}/graphql.json`;

async function graphql(query, variables = {}) {
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.shopify.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 401 || response.status === 403) {
    throw new ApiError(
      'Shopify rejected the access token. Check SHOPIFY_ADMIN_ACCESS_TOKEN and the app scopes.',
      502,
      'SHOPIFY_AUTH_FAILED'
    );
  }

  if (!response.ok) {
    throw new ApiError(`Shopify API error (HTTP ${response.status})`, 502, 'SHOPIFY_HTTP_ERROR');
  }

  const body = await response.json();
  if (body.errors?.length) {
    throw new ApiError(`Shopify GraphQL error: ${body.errors[0].message}`, 502, 'SHOPIFY_GRAPHQL_ERROR');
  }

  return body.data;
}

const COUNTS_QUERY = `
  query StoreCounts {
    shop { name }
    productsCount { count }
    ordersCount { count }
    customersCount { count }
    collectionsCount { count }
  }
`;

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor, sortKey: TITLE) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        title
        handle
        status
        vendor
        productType
        totalInventory
        featuredImage { url altText }
        variants(first: 20) {
          nodes { id title sku inventoryQuantity price }
        }
      }
    }
  }
`;

const ORDERS_QUERY = `
  query Orders($cursor: String) {
    orders(first: 100, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        createdAt
        displayFinancialStatus
        displayFulfillmentStatus
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        customer { displayName email }
        lineItems(first: 25) {
          nodes {
            quantity
            title
            sku
            originalUnitPriceSet { shopMoney { amount } }
            product { id title featuredImage { url } }
          }
        }
      }
    }
  }
`;

const CUSTOMERS_QUERY = `
  query Customers($cursor: String) {
    customers(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { id displayName email numberOfOrders createdAt amountSpent { amount } }
    }
  }
`;

const COLLECTIONS_QUERY = `
  query Collections($cursor: String) {
    collections(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { id title handle productsCount { count } }
    }
  }
`;

/** Walks Shopify's cursor pagination, capped so a huge store can't stall a request. */
async function paginate(query, rootKey, { maxPages = 5 } = {}) {
  const nodes = [];
  let cursor = null;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await graphql(query, { cursor });
    const connection = data[rootKey];
    nodes.push(...connection.nodes);
    if (!connection.pageInfo.hasNextPage) break;
    cursor = connection.pageInfo.endCursor;
  }

  return nodes;
}

const normalizeProduct = (node) => ({
  id: node.id,
  title: node.title,
  handle: node.handle,
  status: node.status,
  vendor: node.vendor || '—',
  productType: node.productType || '—',
  image: node.featuredImage?.url || null,
  totalInventory: node.totalInventory ?? 0,
  price: Number(node.variants.nodes[0]?.price ?? 0),
  variants: node.variants.nodes.map((v) => ({
    id: v.id,
    title: v.title,
    sku: v.sku || '—',
    price: Number(v.price ?? 0),
    inventoryQuantity: v.inventoryQuantity ?? 0,
  })),
});

const normalizeOrder = (node) => ({
  id: node.id,
  name: node.name,
  customerName: node.customer?.displayName || 'Guest checkout',
  customerEmail: node.customer?.email || '',
  totalAmount: Number(node.currentTotalPriceSet?.shopMoney?.amount ?? 0),
  currency: node.currentTotalPriceSet?.shopMoney?.currencyCode || 'USD',
  paymentStatus: node.displayFinancialStatus || 'PENDING',
  fulfillmentStatus: node.displayFulfillmentStatus || 'UNFULFILLED',
  createdAt: node.createdAt,
  lineItems: node.lineItems.nodes.map((li) => ({
    productId: li.product?.id || null,
    title: li.product?.title || li.title,
    sku: li.sku || '—',
    image: li.product?.featuredImage?.url || null,
    quantity: li.quantity,
    price: Number(li.originalUnitPriceSet?.shopMoney?.amount ?? 0),
  })),
});

export async function fetchStoreSnapshot() {
  const [counts, products, orders, customers, collections] = await Promise.all([
    graphql(COUNTS_QUERY),
    paginate(PRODUCTS_QUERY, 'products'),
    paginate(ORDERS_QUERY, 'orders', { maxPages: 3 }),
    paginate(CUSTOMERS_QUERY, 'customers', { maxPages: 3 }),
    paginate(COLLECTIONS_QUERY, 'collections', { maxPages: 2 }),
  ]);

  return {
    shopName: counts.shop?.name || config.shopify.domain,
    products: products.map(normalizeProduct),
    orders: orders.map(normalizeOrder),
    customers: customers.map((c) => ({
      id: c.id,
      name: c.displayName,
      email: c.email || '',
      ordersCount: c.numberOfOrders ?? 0,
      totalSpent: Number(c.amountSpent?.amount ?? 0),
      createdAt: c.createdAt,
    })),
    collections: collections.map((c) => ({
      id: c.id,
      title: c.title,
      handle: c.handle,
      productsCount: c.productsCount?.count ?? 0,
    })),
    counts: {
      products: counts.productsCount?.count ?? products.length,
      orders: counts.ordersCount?.count ?? orders.length,
      customers: counts.customersCount?.count ?? customers.length,
      collections: counts.collectionsCount?.count ?? collections.length,
    },
    fetchedAt: new Date().toISOString(),
  };
}
