import { Router } from 'express';
import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { routes } from './routes/index.js';

import { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from '@dos/service-bootstrap/health';

// Health check router with DB, Redis, and EventBus probes
app.use(createHealthRouter('workspace_bff', {
  db: dbHealthCheck,
  redis: redisHealthCheck,
  eventBus: eventBusHealthCheck,
}));

const SERVICE_CODE = 'workspace-bff';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  // Root /healthz alias for PM2 / Cloudflare / k8s-style probes that
  // hit the service root rather than the /api prefix.
  const rootRouter = Router();
  rootRouter.get('/healthz', (_req, res) =>
    res.json({ ok: true, service: 'workspace-bff' }),
  );
  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/', router: rootRouter },
      { path: '/api', router: routes },
    ],
  });

  await start();
}

main().catch((err) => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
