import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { routes } from './routes/index.js';
import { startAutoEvaluator } from './lib/auto-evaluator.js';

const SERVICE_CODE = 'rollout-service';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);
  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [{ path: '/api', router: routes }],
  });
  await start();
  if (process.env.ROLLOUT_AUTO_EVAL !== '0') startAutoEvaluator();
}

main().catch((err) => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
