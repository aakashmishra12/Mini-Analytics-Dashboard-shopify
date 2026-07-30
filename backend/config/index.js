import 'dotenv/config';

const shopDomain = (process.env.SHOPIFY_STORE_DOMAIN || '').trim();
const accessToken = (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '').trim();

const hasShopifyCredentials = Boolean(shopDomain && accessToken);
const mockRequested = String(process.env.USE_MOCK_DATA || '').toLowerCase() === 'true';

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  cacheTtlMinutes: Number(process.env.CACHE_TTL_MINUTES) || 15,
  lowInventoryThreshold: Number(process.env.LOW_INVENTORY_THRESHOLD) || 10,
  criticalInventoryThreshold: Number(process.env.CRITICAL_INVENTORY_THRESHOLD) || 5,
  shopify: {
    domain: shopDomain,
    accessToken,
    apiVersion: process.env.SHOPIFY_API_VERSION || '2025-01',
  },
  // Mock mode is used when explicitly requested, or whenever credentials are absent
  // so the dashboard is always demoable.
  useMockData: mockRequested || !hasShopifyCredentials,
  hasShopifyCredentials,
};

export const dataSource = config.useMockData ? 'mock' : 'shopify';
