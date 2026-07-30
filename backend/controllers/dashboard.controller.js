import { asyncHandler } from '../middleware/errorHandler.js';
import { getSnapshot, buildDashboard, invalidateCache, getCacheStatus } from '../services/store.service.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const snapshot = await getSnapshot();
  res.json({ data: buildDashboard(snapshot) });
});

export const refreshData = asyncHandler(async (req, res) => {
  invalidateCache();
  const snapshot = await getSnapshot({ forceRefresh: true });
  res.json({
    data: {
      message: 'Store data refreshed from source',
      dataSource: snapshot.meta.dataSource,
      lastUpdated: snapshot.meta.lastUpdated,
      counts: snapshot.counts,
    },
  });
});

export const getHealth = (req, res) => {
  res.json({ data: { status: 'ok', uptimeSeconds: Math.round(process.uptime()), cache: getCacheStatus() } });
};
