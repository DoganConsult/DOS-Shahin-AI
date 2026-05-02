import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import { routes } from './routes/index';
import { setServiceBus } from './events/publisher';
import { registerConsumers } from './events/consumer';

const SERVICE_CODE = 'agrc-os-service';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
    logger,
  });
  setEventBus(eventBus as any);
  setServiceBus(eventBus);

  registerConsumers(eventBus);
  eventBus.startConsuming().catch((err: Error) => {
    console.error(`[${SERVICE_CODE}] Consumer error:`, err);
  });

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/agrc-engine', router: routes },
      { path: '/api/agrc', router: routes },
    ],
    healthChecks: {
      database: async () => {
        try {
          const { query } = await import('@dos/db');
          const result = await query('SELECT 1');
          return !!result;
        } catch { return false; }
      },
    },
  });

  await start();
}

main().catch(err => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
