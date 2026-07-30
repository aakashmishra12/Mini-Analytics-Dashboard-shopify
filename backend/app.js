import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((o) => o.trim()),
    })
  );
  app.use(express.json());
  if (config.nodeEnv !== 'test') app.use(morgan('dev'));

  app.get('/', (req, res) => {
    res.json({
      data: {
        name: 'Mini Analytics Dashboard API',
        dataSource: config.useMockData ? 'mock' : 'shopify',
        endpoints: [
          'GET /api/health',
          'GET /api/dashboard',
          'GET /api/orders',
          'GET /api/orders/export',
          'GET /api/products',
          'GET /api/products/top-selling',
          'GET /api/inventory',
          'POST /api/refresh',
        ],
      },
    });
  });

  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
