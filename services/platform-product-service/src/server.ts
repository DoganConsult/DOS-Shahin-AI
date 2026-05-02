import { createServiceServer, loadModuleRoute } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import { Router, Request, Response } from 'express';
import { safeQuery } from '@dos/db';
import { routes, knowledgeRoutes } from './routes/index';
import { setServiceBus } from './events/publisher';
import { registerConsumers } from './events/consumer';
import { authenticate, requireTenantId } from '@dos/dauth-shared';

// Phase-12E wire-closure: host modules/operating-cockpit at /api/operating-cockpit.
// Backed by modules/operating-cockpit route file (health-grid, alerts, slas, ...).
const operatingCockpitRouter = loadModuleRoute(
  'operating-cockpit/operating-cockpit',
  '../../../modules/operating-cockpit/dist/backend/operating-cockpit/routes/operating-cockpit.routes',
);

// Phase-12E: /api/platform-stats — tenant-scoped cross-module counters for
// the workspace-home dashboard. Defensive fallback returns zeros on a
// fresh tenant. All queries are parameterised.
const platformStatsRouter = Router();
platformStatsRouter.use(authenticate);
platformStatsRouter.use(requireTenantId);
platformStatsRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId as string;
  const count = async (sql: string) => {
    try {
      const r = await safeQuery(sql, [tenantId]);
      return Number((r.rows[0] as Record<string, unknown>)?.['n'] ?? 0);
    } catch { return 0; }
  };
  const [risks, controls, findings, policies, evidence, vendors, incidents, assets] = await Promise.all([
    count(`SELECT COUNT(*)::int AS n FROM public.risks WHERE tenant_id = $1 AND (deleted_at IS NULL OR deleted_at IS NULL)`),
    count(`SELECT COUNT(*)::int AS n FROM public.controls WHERE tenant_id = $1 AND (deleted_at IS NULL OR deleted_at IS NULL)`),
    count(`SELECT COUNT(*)::int AS n FROM public.findings WHERE tenant_id = $1 AND status IN ('open','in_progress','active')`),
    count(`SELECT COUNT(*)::int AS n FROM public.policies WHERE tenant_id = $1 AND (deleted_at IS NULL OR deleted_at IS NULL)`),
    count(`SELECT COUNT(*)::int AS n FROM public.evidence_items WHERE tenant_id = $1`),
    count(`SELECT COUNT(*)::int AS n FROM public.vendors WHERE tenant_id = $1 AND (deleted_at IS NULL OR deleted_at IS NULL)`),
    count(`SELECT COUNT(*)::int AS n FROM public.incidents WHERE tenant_id = $1 AND status IN ('open','investigating','contained')`),
    count(`SELECT COUNT(*)::int AS n FROM public.assets WHERE tenant_id = $1 AND (deleted_at IS NULL OR deleted_at IS NULL)`),
  ]);
  res.json({
    data: { risks, controls, findings, policies, evidence, vendors, incidents, assets },
    generatedAt: new Date().toISOString(),
  });
});

const SERVICE_CODE = 'platform-product-service';

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
      { path: '/api/product', router: routes },
      // Dedicated /api/knowledge mount exposing the knowledge module at its
      // natural prefix (no /product/ nesting) for <app-ai-insight-panel>.
      { path: '/api/knowledge', router: knowledgeRoutes },
      // Phase-12E wire-closure: operating-cockpit + platform-stats.
      { path: '/api/operating-cockpit', router: operatingCockpitRouter },
      { path: '/api/platform-stats',    router: platformStatsRouter },
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
