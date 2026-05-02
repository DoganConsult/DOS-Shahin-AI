import { createServiceServer, type ModuleRegistration } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import { routes, shellRouter } from './routes/index';
import dashboardReportsRouter from './routes/dashboard-reports.routes';
import { loadModuleRoute } from '@dos/service-bootstrap';
import { setServiceBus } from './events/publisher';

// Phase-12E wire-closure: dedicated /api/dashboard-editor surface consumed
// by Shahin features/dashboard-editor/services/dashboard-editor.service.ts.
// Backed by modules/dashboard/dist/dashboard/routes/dashboard-editor.routes
// (same router also mounted under /api/widget/dashboard-editor internally
// for the legacy path). loadModuleRoute returns an empty Router if the
// compiled dist is absent.
// modules/dashboard compiles with rootDir=source/backend — emitted path is
// dist/dashboard/routes/... (no intermediate 'backend/' segment).
const dashboardEditorTopLevelRouter = loadModuleRoute(
  'dashboard/dashboard-editor',
  '../../../modules/dashboard/dist/dashboard/routes/dashboard-editor.routes',
);
import { registerConsumers, registerModuleConsumers } from './events/consumer';

// ── Wave 2D: Module Lifecycle Hooks ──────────────────────────────────────

async function loadModuleRegistrations(moduleCode: string): Promise<ModuleRegistration[]> {
  const registrations: ModuleRegistration[] = [];
  try {
    // Resolve the BUILT module entry (modules/<m>/dist/<m>/<m>.module.js).
    // The previous path pointed at `source/backend/...` which only has
    // `.ts` files at runtime — guaranteed MODULE_NOT_FOUND.
    const modulePath = `../../../modules/${moduleCode}/dist/${moduleCode}/${moduleCode}.module`;
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
    const modulePath = `../../../modules/${moduleCode}/dist/${moduleCode}/${moduleCode}.module`;
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
    const manifestPath = `../../../modules/${moduleCode}/dist/${moduleCode}/manifest/${moduleCode}.manifest`;
    const manifest = require(manifestPath);
    if (manifest?.lifecycleParticipation) {
      console.log(`[${serviceCode}] Module ${moduleCode} lifecycle participation confirmed`);
    }
  } catch {
    // Manifest not available — non-fatal
  }
}

const SERVICE_CODE = 'dashboard-widgets-service';

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
      { path: '/api/widgets', router: routes },
      { path: '/api/widget', router: routes },
      // Phase-12E reports-vertical closure: dashboard data feeds consumed
      // by features/reports/pages/{audit-report,evidence-report}. Routes:
      //   GET /api/dashboard/audit-pack
      //   GET /api/dashboard/exceptions-aging
      //   GET /api/dashboard/control-drift
      //   GET /api/dashboard/evidence-queue
      { path: '/api/dashboard', router: dashboardReportsRouter },
      // Phase-12E wire-closure: dedicated /api/dashboard-editor surface.
      { path: '/api/dashboard-editor', router: dashboardEditorTopLevelRouter },
      // V2b — Shahin shell calls /api/shell/config/* and /api/shell/preferences/*
      // directly. shellRouter is the same module route used internally for
      // /api/dashboard/shell-config.
      { path: '/api/shell', router: shellRouter },
    ],
    // Wave 2D: Module lifecycle registration
    modules: await loadModuleRegistrations('dashboard'),
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
      // Wave 2D: invoke module onBoot hooks
      invokeModuleLifecycleHooks(SERVICE_CODE, 'dashboard').catch(() => {});
    },
  });

  await start();
}

main().catch(err => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
