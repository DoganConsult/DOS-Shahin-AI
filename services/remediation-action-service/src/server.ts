import { createServiceServer, type ModuleRegistration } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import remediationRouter from './routes/remediation.routes';
import actionItemRouter from './routes/action-item.routes';
import { routes } from './routes/index';
import { setServiceBus } from './events/publisher';
import { registerConsumers, registerModuleConsumers } from './events/consumer';

import { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from '@dos/service-bootstrap/health';

// Health check router with DB, Redis, and EventBus probes
app.use(createHealthRouter('remediation_action', {
  db: dbHealthCheck,
  redis: redisHealthCheck,
  eventBus: eventBusHealthCheck,
}));

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

const SERVICE_CODE = 'remediation-action-service';

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

  const remediationModules = await loadModuleRegistrations('remediation');
  const actionModules = await loadModuleRegistrations('action');

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/remediation', router: remediationRouter },
      { path: '/api/action', router: actionItemRouter },
      { path: '/api/remediation-action', router: routes },
    ],
    modules: [...remediationModules, ...actionModules],
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
      invokeModuleLifecycleHooks(SERVICE_CODE, 'remediation').catch(() => {});
      invokeModuleLifecycleHooks(SERVICE_CODE, 'action').catch(() => {});
    },
  });

  await start();
}

main().catch(err => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
