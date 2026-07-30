import { asyncHandler } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import { getSnapshot } from '../services/store.service.js';
import { lowInventoryVariants, paginate } from '../utils/analytics.js';

export const getLowInventory = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query;
  const threshold = Number(req.query.threshold) || config.lowInventoryThreshold;
  const criticalThreshold = Number(req.query.criticalThreshold) || config.criticalInventoryThreshold;

  const snapshot = await getSnapshot();
  let rows = lowInventoryVariants(snapshot.products, { threshold, criticalThreshold });

  if (search) {
    const q = search.toLowerCase().trim();
    rows = rows.filter(
      (r) => r.productName.toLowerCase().includes(q) || (r.sku || '').toLowerCase().includes(q)
    );
  }

  const { items, pagination } = paginate(rows, page, limit);

  res.json({
    data: items,
    pagination,
    summary: {
      threshold,
      criticalThreshold,
      lowCount: rows.length,
      criticalCount: rows.filter((r) => r.critical).length,
    },
    meta: snapshot.meta,
  });
});
