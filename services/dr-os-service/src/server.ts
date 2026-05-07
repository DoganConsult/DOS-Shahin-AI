import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { routes } from './routes/index.js';

import { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from '@dos/service-bootstrap/health';

// Health check router with DB, Redis, and EventBus probes
app.use(createHealthRouter('dr_os', {
  db: dbHealthCheck,
  redis: redisHealthCheck,
  eventBus: eventBusHealthCheck,
}));

const SERVICE_CODE = 'dr-os-service';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);
  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [{ path: '/api', router: routes }],
  });
  await start();
}

main().catch((err) => { console.error(`Failed to start ${SERVICE_CODE}:`, err); process.exit(1); });
