import { createServiceServer, type ModuleRegistration } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import { routes } from './routes/index';
import privacyExtensionsRouter from './routes/privacy-extensions.routes';
import privacyOpsRouter from './routes/privacy-ops.routes';
import { setServiceBus } from './events/publisher';
import { registerConsumers, registerModuleConsumers } from './events/consumer';

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

const SERVICE_CODE = 'privacy-service';

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

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      // Phase-12E wire-closure: extensions router mounted BEFORE the base
      // privacy router so /budgets, /dsr-requests, /dpias,
      // /processing-activities are resolved by the new dedicated handlers.
      // The main router still handles /, /dashboard, /search, /trends etc.
      { path: '/api/privacy', router: privacyExtensionsRouter },
      { path: '/api/privacy', router: routes },
      // Shahin privacy-ops console — /ropa, /dsr, /consent, /breaches, /retention.
      // Separate router from /api/privacy so the FE's distinct /api/privacy-ops/*
      // namespace stays decoupled from the listing/dashboard surface above.
      { path: '/api/privacy-ops', router: privacyOpsRouter },
    ],
    modules: await loadModuleRegistrations('privacy'),
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
      invokeModuleLifecycleHooks(SERVICE_CODE, 'privacy').catch(() => {});
    },
  });

  await start();
}

main().catch(err => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
