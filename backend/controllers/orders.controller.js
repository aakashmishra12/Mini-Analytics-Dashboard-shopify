import { asyncHandler } from '../middleware/errorHandler.js';
import { getSnapshot } from '../services/store.service.js';
import { searchOrders, paginate } from '../utils/analytics.js';
import { toCsv } from '../utils/csv.js';

export const getOrders = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query;
  const snapshot = await getSnapshot();
  const filtered = searchOrders(snapshot.orders, search);
  const { items, pagination } = paginate(filtered, page, limit);

  res.json({
    data: items.map(({ lineItems, ...order }) => ({ ...order, itemCount: lineItems.length })),
    pagination,
    meta: snapshot.meta,
  });
});

export const exportOrders = asyncHandler(async (req, res) => {
  const { search = '' } = req.query;
  const snapshot = await getSnapshot();
  const filtered = searchOrders(snapshot.orders, search);

  const csv = toCsv(filtered, [
    { key: 'name', header: 'Order Number' },
    { key: 'customerName', header: 'Customer' },
    { key: 'customerEmail', header: 'Email' },
    { key: 'totalAmount', header: 'Total' },
    { key: 'currency', header: 'Currency' },
    { key: 'paymentStatus', header: 'Payment Status' },
    { key: 'fulfillmentStatus', header: 'Fulfillment Status' },
    { key: 'createdAt', header: 'Order Date' },
  ]);

  const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});
