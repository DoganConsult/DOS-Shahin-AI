import type { Express } from 'express';
import { createServiceServer, type ModuleRegistration } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import incidentRouter from './routes/incident.routes';
import {
  routes,
  riskWorkspaceRouter,
  riskSmartRouter,
  riskMetricsRouter,
  riskScoringRouter,
  riskTrendsRouter,
  riskQuantificationRouter,
  riskMonteCarloRouter,
  riskPeerReviewTopLevelRouter,
  issuesRouter,
  fitchRouter,
} from './routes/index';
import { setServiceBus } from './events/publisher';
import { registerConsumers, registerModuleConsumers } from './events/consumer';
import {
  registerRisk,
  riskRoutes,
} from '@dos/module-risk';

const SERVICE_CODE = 'risk-incident-service';

async function registerRiskModule(_app: Express): Promise<void> {
  await registerRisk({});
}

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
  // Wave 2C: register module-level event subscribers
  registerModuleConsumers(eventBus);
  eventBus.startConsuming().catch((err: Error) => {
    console.error(`[${SERVICE_CODE}] Consumer error:`, err);
  });

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/risk', router: riskRoutes },
      { path: '/api/incident', router: incidentRouter },
      { path: '/api/risk-incident', router: routes },
      { path: '/api/risk-ws', router: riskWorkspaceRouter },
      { path: '/api/risk-smart', router: riskSmartRouter },
      { path: '/api/risk-metrics', router: riskMetricsRouter },
      { path: '/api/risk-scoring', router: riskScoringRouter },
      { path: '/api/risk-trends', router: riskTrendsRouter },
      { path: '/api/risk-quantification', router: riskQuantificationRouter },
      { path: '/api/monte-carlo', router: riskMonteCarloRouter },
      // Gateway FE prefix (core-special-routes.catalog); was 404 when only nested under /api/risk-incident
      { path: '/api/risk-peer-review', router: riskPeerReviewTopLevelRouter },
      // Phase 4 deeper (2026-04-30): top-level FE prefixes lifted from /api/risk-incident/{issues,fitch}
      // so issues-api.service.ts and fitch.service.ts canonical /api/issues + /api/fitch resolve.
      { path: '/api/issues', router: issuesRouter },
      { path: '/api/fitch', router: fitchRouter },
    ],
    modules: [{ moduleCode: 'risk', register: registerRiskModule } satisfies ModuleRegistration],
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
