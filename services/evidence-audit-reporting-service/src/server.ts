import { createServiceServer, type ModuleRegistration } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import { loadModuleRoute } from '@dos/service-bootstrap';
import evidenceRouter from './routes/evidence.routes';
import findingRouter from './routes/finding.routes';
import exportRouter from './routes/export.routes';
import { routes, evidenceTasksRouter } from './routes/index';
import { setServiceBus } from './events/publisher';
import { registerConsumers, registerModuleConsumers } from './events/consumer';

import { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from '@dos/service-bootstrap/health';

// Health check router with DB, Redis, and EventBus probes
app.use(createHealthRouter('evidence_audit_reporting', {
  db: dbHealthCheck,
  redis: redisHealthCheck,
  eventBus: eventBusHealthCheck,
}));

// Phase 11 (M5): Shahin FE calls /api/reports/* and /api/reporting/*
// as top-level gateway-routed prefixes (see ReportsApiService,
// ReportingApiService, ReportFactoryCatalogService). Load the compiled
// module routers here and mount them at the Shahin-expected paths,
// mirroring the Phase 10A pattern from compliance-controls-service.
const reportsHubRouter = loadModuleRoute(
  'reporting/report/report-hub',
  '../../../modules/reporting/dist/backend/reporting/routes/report/report-hub.routes',
);
const reportsCenterRouter = loadModuleRoute(
  'reporting/report/report-center',
  '../../../modules/reporting/dist/backend/reporting/routes/report/report-center.routes',
);
const reportsGeneratorRouter = loadModuleRoute(
  'reporting/report/report-generator',
  '../../../modules/reporting/dist/backend/reporting/routes/report/report-generator.routes',
);
const reportsCoreRouter = loadModuleRoute(
  'reporting/report/report',
  '../../../modules/reporting/dist/backend/reporting/routes/report/report.routes',
);
const reportingAdminRouter = loadModuleRoute(
  'reporting/reporting/reporting-admin',
  '../../../modules/reporting/dist/backend/reporting/routes/reporting/reporting-admin.routes',
);
const reportingAdvancedRouter = loadModuleRoute(
  'reporting/reporting/reporting-advanced',
  '../../../modules/reporting/dist/backend/reporting/routes/reporting/reporting-advanced.routes',
);
const reportingDiagnosticsRouter = loadModuleRoute(
  'reporting/reporting-diagnostics',
  '../../../modules/reporting/dist/backend/reporting/routes/reporting-diagnostics.routes',
);

// ── Wave 2D: Module Lifecycle Hooks ──────────────────────────────────────

async function loadModuleRegistrations(moduleCode: string): Promise<ModuleRegistration[]> {
  const registrations: ModuleRegistration[] = [];
  try {
    const modulePath = `../../../modules/${moduleCode}/source/backend/${moduleCode}/${moduleCode}.module`;
    const mod = require(modulePath);
    if (mod && typeof mod.register === 'function') {
      registrations.push({ moduleCode, register: mod.register });
    }
  } catch {
    // Module not available — service works without it
  }
  return registrations;
}

async function invokeModuleLifecycleHooks(serviceCode: string, moduleCode: string): Promise<void> {
  try {
    const modulePath = `../../../modules/${moduleCode}/source/backend/${moduleCode}/${moduleCode}.module`;
    const mod = require(modulePath);
    if (mod?.onBoot && typeof mod.onBoot === 'function') {
      await mod.onBoot();
      console.log(`[${serviceCode}] Module ${moduleCode} onBoot completed`);
    }
    if (mod?.onReady && typeof mod.onReady === 'function') {
      await mod.onReady();
      console.log(`[${serviceCode}] Module ${moduleCode} onReady completed`);
    }
  } catch (err) {
    console.warn(`[${serviceCode}] Module lifecycle hooks for ${moduleCode} failed (non-fatal):`, err);
  }

  try {
    const manifestPath = `../../../modules/${moduleCode}/source/backend/${moduleCode}/manifest/${moduleCode}.manifest`;
    const manifest = require(manifestPath);
    if (manifest?.lifecycleParticipation) {
      console.log(`[${serviceCode}] Module ${moduleCode} lifecycle participation confirmed`);
    }
  } catch {
    // Manifest not available — non-fatal
  }
}

const SERVICE_CODE = 'evidence-audit-reporting-service';

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
  registerModuleConsumers(eventBus);
  eventBus.startConsuming().catch((err: Error) => {
    console.error(`[${SERVICE_CODE}] Consumer error:`, err);
  });

  // Load registrations for both modules
  const evidenceModules = await loadModuleRegistrations('evidence');
  const auditModules = await loadModuleRegistrations('audit');

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/evidence', router: evidenceRouter },
      // Phase 6 deeper (2026-04-30): FE evidence-api.service.ts hits
      // /api/evidence-tasks directly. Lifted from the nested aggregator path.
      { path: '/api/evidence-tasks', router: evidenceTasksRouter },
      { path: '/api/finding', router: findingRouter },
      { path: '/api/export', router: exportRouter },
      { path: '/api/evidence-audit-reporting', router: routes },
      // Phase 11 (M5) Shahin FE surface.
      // Multiple routers mounted at /api/reports so handlers fall
      // through in order (report-hub first, then report-center,
      // report-generator, report). /api/reporting gets its admin +
      // advanced + diagnostics routers.
      { path: '/api/reports', router: reportsHubRouter },
      { path: '/api/reports', router: reportsCenterRouter },
      { path: '/api/reports', router: reportsGeneratorRouter },
      { path: '/api/reports', router: reportsCoreRouter },
      { path: '/api/reporting', router: reportingAdminRouter },
      { path: '/api/reporting', router: reportingAdvancedRouter },
      { path: '/api/reporting/diagnostics', router: reportingDiagnosticsRouter },
    ],
    modules: [...evidenceModules, ...auditModules],
    healthChecks: {
      database: async () => {
        try {
          const { query } = await import('@dos/db');
          const result = await query('SELECT 1');
          return !!result;
        } catch { return false; }
      },
    },
    onReady: () => {
      invokeModuleLifecycleHooks(SERVICE_CODE, 'evidence').catch(() => {});
      invokeModuleLifecycleHooks(SERVICE_CODE, 'audit').catch(() => {});
    },
  });

  await start();
}

main().catch(err => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
