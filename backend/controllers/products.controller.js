import { asyncHandler } from '../middleware/errorHandler.js';
import { getSnapshot } from '../services/store.service.js';
import { searchProducts, paginate, topSellingProducts } from '../utils/analytics.js';

export const getProducts = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query;
  const snapshot = await getSnapshot();
  const filtered = searchProducts(snapshot.products, search);
  const { items, pagination } = paginate(filtered, page, limit);

  res.json({ data: items, pagination, meta: snapshot.meta });
});

export const getTopSelling = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 5;
  const snapshot = await getSnapshot();

  res.json({ data: topSellingProducts(snapshot.orders, limit), meta: snapshot.meta });
});
