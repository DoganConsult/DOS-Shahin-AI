import { createServiceServer, type ModuleRegistration } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import { routes, aiGovernanceTopLevelMounts } from './routes/index';
import { setServiceBus } from './events/publisher';
import { registerConsumers, registerModuleConsumers } from './events/consumer';

// ── Wave 2D: Module Lifecycle Hooks ──────────────────────────────────────

async function loadModuleRegistrations(moduleCode: string): Promise<ModuleRegistration[]> {
  const registrations: ModuleRegistration[] = [];
  try {
    const modulePath = `../../../modules/${moduleCode}/source/backend/${moduleCode}/${moduleCode}.module`;
    // Dynamic require — runtime path resolved per moduleCode, loaded from compiled dist.
    const mod = require(modulePath) as { register?: ModuleRegistration['register'] };
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
    // Dynamic require — runtime path resolved per moduleCode, loaded from compiled dist.
    const mod = require(modulePath) as { onBoot?: () => Promise<void>; onReady?: () => Promise<void> };
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
}

const SERVICE_CODE = 'ai-governance-service';

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
      // Aggregator (admin / diagnostics)
      { path: '/api/ai-governance', router: routes },
      // 31 entity-type top-level mounts (FE contract — see API-WIRE-AUDIT §1)
      ...aiGovernanceTopLevelMounts.map(({ path, router }) => ({ path, router })),
    ],
    modules: await loadModuleRegistrations('ai-governance'),
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
      invokeModuleLifecycleHooks(SERVICE_CODE, 'ai-governance').catch(() => {});
    },
  });

  await start();
}

main().catch((err) => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
