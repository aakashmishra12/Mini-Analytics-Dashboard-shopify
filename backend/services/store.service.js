import { config, dataSource } from '../config/index.js';
import { withCache, clearCache, readCache } from '../utils/cache.js';
import * as mockProvider from './mock.provider.js';
import * as shopifyProvider from './shopify.provider.js';
import {
  topSellingProducts,
  lowInventoryVariants,
  ordersByDay,
  inventoryDistribution,
  revenueTotals,
} from '../utils/analytics.js';

const SNAPSHOT_KEY = 'store:snapshot';

const provider = () => (config.useMockData ? mockProvider : shopifyProvider);

/**
 * Every endpoint reads through this one cached snapshot, so a page load costs
 * at most one round-trip to Shopify regardless of how many sections render.
 */
export async function getSnapshot({ forceRefresh = false } = {}) {
  const result = await withCache(SNAPSHOT_KEY, () => provider().fetchStoreSnapshot(), { forceRefresh });
  return {
    ...result.data,
    meta: {
      dataSource,
      cached: result.cached,
      stale: Boolean(result.stale),
      lastUpdated: new Date(result.updatedAt).toISOString(),
      cacheTtlMinutes: config.cacheTtlMinutes,
    },
  };
}

export function getCacheStatus() {
  const cached = readCache(SNAPSHOT_KEY);
  if (!cached) return { populated: false };
  return {
    populated: true,
    isFresh: cached.isFresh,
    lastUpdated: new Date(cached.updatedAt).toISOString(),
  };
}

export function invalidateCache() {
  clearCache();
}

export function buildDashboard(snapshot) {
  const thresholds = {
    threshold: config.lowInventoryThreshold,
    criticalThreshold: config.criticalInventoryThreshold,
  };
  const lowStock = lowInventoryVariants(snapshot.products, thresholds);

  return {
    shopName: snapshot.shopName,
    kpis: {
      totalProducts: snapshot.counts.products,
      totalOrders: snapshot.counts.orders,
      totalCustomers: snapshot.counts.customers,
      totalCollections: snapshot.counts.collections,
    },
    revenue: revenueTotals(snapshot.orders),
    lowStockCount: lowStock.length,
    criticalStockCount: lowStock.filter((r) => r.critical).length,
    charts: {
      ordersByDay: ordersByDay(snapshot.orders, 14),
      inventoryDistribution: inventoryDistribution(snapshot.products, thresholds),
    },
    topProducts: topSellingProducts(snapshot.orders, 5),
    meta: snapshot.meta,
  };
}
