import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import { routes } from './routes/index';
import { adminRouter } from './routes/admin.routes';
import { publicRouter } from './routes/public.routes';
import { signedRouter } from './routes/signed.routes';
import { initStorage, getStorage } from './storage';
import { setContainer } from './container';
import { AssetsService } from './domain/assets.service';
import { PgAssetsRepo, InMemoryAssetsRepo, type AssetsRepo } from './domain/assets.repo';
import { setServiceBus } from './events/publisher';

const SERVICE_CODE = 'sales-room-service';

async function buildRepo(): Promise<AssetsRepo> {
  if (process.env.SALES_ROOM_REPO === 'memory') {
    return new InMemoryAssetsRepo();
  }
  // Default: Postgres via @dos/db. This will FAIL at first query if the
  // module migrations haven't been applied — the unified runner is
  // currently blocked on a pre-existing compliance baseline failure
  // (see Wave 1 report). Use SALES_ROOM_REPO=memory to exercise routes
  // end-to-end without DB tables for smoke tests.
  const { query } = await import('@dos/db');
  return new PgAssetsRepo(query as any);
}

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
    logger,
  });
  setEventBus(eventBus as any);
  setServiceBus(eventBus as any);

  const storage = initStorage({
    driver: process.env.SALES_ROOM_STORAGE_DRIVER || 'fs',
    fsRoot: process.env.SALES_ROOM_FS_ROOT || '/data/sales-room/objects',
  });

  const repo = await buildRepo();
  const assetsService = new AssetsService({ repo, storage });
  setContainer({ assetsService, storage });

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/sales-room', router: routes },
      { path: '/api/sales-room/admin', router: adminRouter },
      { path: '/api/public/sales-room', router: publicRouter },
      { path: '/api/sales-room/sig', router: signedRouter },
    ],
    healthChecks: {
      database: async () => {
        try {
          // In-memory repo bypasses the DB by design.
          if (process.env.SALES_ROOM_REPO === 'memory') return true;
          const { query } = await import('@dos/db');
          const result = await query('SELECT 1');
          return !!result;
        } catch { return false; }
      },
      storage: async () => {
        try { return !!getStorage(); } catch { return false; }
      },
    },
  });

  await start();
}

main().catch(err => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
