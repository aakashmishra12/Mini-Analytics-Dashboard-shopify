import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

/**
 * When the frontend has been built, one process serves both halves from a
 * single origin, which is what the free hosting tiers make cheapest and what
 * removes the need for CORS at all. Running the API alone still works: the
 * dist folder is simply absent in development and the JSON index takes over.
 */
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/dist');
const servesFrontend = existsSync(path.join(distDir, 'index.html'));

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((o) => o.trim()),
    })
  );
  app.use(express.json());
  if (config.nodeEnv !== 'test') app.use(morgan('dev'));

  if (servesFrontend) app.use(express.static(distDir));

  app.get('/', (req, res, next) => {
    if (servesFrontend) return next();
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

  // Client-side routing: anything that is not an API call falls back to the
  // shell. Unknown /api paths deliberately skip this and 404 as JSON.
  if (servesFrontend) {
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
