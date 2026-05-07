import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { routes } from './routes/index.js';
import { startAutoEvaluator, setSignalReader } from './lib/auto-evaluator.js';
import { RealSignalReader } from './lib/signal-adapters.js';

import { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from '@dos/service-bootstrap/health';

// Health check router with DB, Redis, and EventBus probes
app.use(createHealthRouter('rollout', {
  db: dbHealthCheck,
  redis: redisHealthCheck,
  eventBus: eventBusHealthCheck,
}));

const SERVICE_CODE = 'rollout-service';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);
  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [{ path: '/api', router: routes }],
  });
  await start();
  if (process.env.ROLLOUT_AUTO_EVAL !== '0') {
    if (process.env.ROLLOUT_SIGNAL_MODE === 'real') setSignalReader(new RealSignalReader());
    startAutoEvaluator();
  }
}

main().catch((err) => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
