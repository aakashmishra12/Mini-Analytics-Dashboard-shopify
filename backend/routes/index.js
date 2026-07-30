import { Router } from 'express';
import { getDashboard, refreshData, getHealth } from '../controllers/dashboard.controller.js';
import { getOrders, exportOrders } from '../controllers/orders.controller.js';
import { getProducts, getTopSelling } from '../controllers/products.controller.js';
import { getLowInventory } from '../controllers/inventory.controller.js';

const router = Router();

router.get('/health', getHealth);
router.get('/dashboard', getDashboard);

router.get('/orders', getOrders);
router.get('/orders/export', exportOrders);

router.get('/products', getProducts);
router.get('/products/top-selling', getTopSelling);

router.get('/inventory', getLowInventory);

router.post('/refresh', refreshData);

export default router;
