import { createApp } from './app.js';
import { config, dataSource } from './config/index.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`\n  Mini Analytics Dashboard API`);
  console.log(`  → http://localhost:${config.port}`);
  console.log(`  → data source: ${dataSource}${config.useMockData && config.hasShopifyCredentials ? ' (USE_MOCK_DATA=true overrides credentials)' : ''}`);
  console.log(`  → cache TTL: ${config.cacheTtlMinutes} min\n`);
});
