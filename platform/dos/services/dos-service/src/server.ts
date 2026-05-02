/**
 * DOS service entry point.
 *
 * Bootstraps:
 *   1. Event backbone (Redis-backed).
 *   2. DOSPort with Pg-backed repositories.
 *   3. REST surface at /api/dos/port/v1 (6 endpoints matching DOSPort 1:1).
 *   4. Health + readiness endpoints at /api/dos/{health,ready}.
 *   5. Unified error middleware (self-logs 5xx as platform_events_log rows).
 *   6. Graceful shutdown on SIGINT / SIGTERM.
 */

import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { query } from '@dos/db';
import dosPortRouter, { wireModulesList, wireLifecycleRepositories } from './routes/port/dos-port.routes';
import platformHealthRouter from './routes/platform/platform-health.routes';
import { bootstrapDOSPlatformPort } from './bootstrap/dos-port.bootstrap';
import {
  tryGetDOSPort,
  getDOSPort,
  PgModulesRepository,
  PgProductsRepository,
  PgTenantsRepository,
  PgEventsLogRepository,
  PgScheduledJobsRepository,
  loadProducts,
  startSchedulerLoop,
  type BackbonePublisher,
  type BackboneSubscriber,
  type JobHandler,
  type ScheduledJobRow,
} from '@dos/dos-core';
import { join } from 'node:path';
import type { PlatformEventEnvelope } from '@dos/ports/dos';
import { dosErrorMiddleware } from './middleware/error.middleware';

const SERVICE_CODE = 'dos-service';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
  });

  const backbonePublisher: BackbonePublisher = {
    async publish(event: PlatformEventEnvelope) {
      await (eventBus as any).publish(event.eventType, event.payload ?? {}, {
        tenantId: event.tenantId,
        correlationId: event.correlationId,
      });
    },
  };
  const backboneSubscriber: BackboneSubscriber = {
    subscribe(eventType, subscriberId, handler) {
      (eventBus as any).subscribe(eventType, async (envelope: any) => {
        try {
          await handler({
            eventType: envelope.eventType ?? eventType,
            tenantId: envelope.tenantId ?? '',
            occurredAt: envelope.occurredAt ?? new Date().toISOString(),
            payload: envelope.payload ?? envelope.data ?? {},
            correlationId: envelope.correlationId,
          });
        } catch (err) {
          console.error('[dos-service] subscriber error', { eventType, subscriberId, err });
        }
      });
    },
  };

  const queryFn = async (text: string, params: unknown[]) => {
    const result = await query(text, params as any[]);
    return { rows: result.rows };
  };
  bootstrapDOSPlatformPort({ query: queryFn, backbonePublisher, backboneSubscriber });

  // Module listing for the REST /modules endpoint. Uses the SAME
  // Pg repo the port uses internally; bypass is only at the
  // HTTP-surface level so the sync DOSPort contract stays unchanged.
  const modulesRepo = new PgModulesRepository(queryFn);
  wireModulesList(async (layer) => {
    const all = await modulesRepo.list();
    return layer ? all.filter((m) => m.layer === layer) : all;
  });

  wireLifecycleRepositories({
    tenants: new PgTenantsRepository(queryFn),
    events: new PgEventsLogRepository(queryFn),
  });

  console.log('[dos-service] DOSPort bound');

  // ── Product Registry loader ──────────────────────────────────
  // Discover every products/<name>/manifest/product.manifest.json
  // and upsert into platform_dos.products_registry, emitting a
  // dos.product.registered event per entry.
  try {
    const repoRoot = process.env.DOS_REPO_ROOT ?? join(__dirname, '..', '..', '..', '..', '..');
    const productsRepo = new PgProductsRepository(queryFn);
    const result = await loadProducts({
      port: getDOSPort(),
      products: productsRepo,
      repoRoot,
    });
    console.log(
      `[dos-service] product registry: discovered ${result.discovered}, ` +
      `registered ${result.registered.length}, errors ${result.errors.length}`,
    );
    if (result.errors.length > 0) {
      for (const e of result.errors) {
        console.warn(`[dos-service] product ${e.dir} failed: ${e.error}`);
      }
    }
  } catch (err) {
    console.error('[dos-service] product registry loader failed (non-fatal)', err);
  }

  // ── Scheduler loop ───────────────────────────────────────────
  // Ticks every minute and fires any active row in
  // platform_dos.scheduled_jobs whose cron_expression matches.
  // Handlers are registered by name — services that want DOS to
  // drive their scheduled work can register (via REST) with a job
  // name the scheduler knows.
  const jobHandlers = new Map<string, JobHandler>();
  // Register a built-in heartbeat that logs + publishes a platform tick.
  jobHandlers.set('dos.heartbeat', async (row: ScheduledJobRow) => {
    await getDOSPort()
      .publishEvent({
        eventType: 'dos.heartbeat.tick',
        tenantId: row.tenantId,
        occurredAt: new Date().toISOString(),
        payload: { jobId: row.jobId },
      })
      .catch(() => {});
  });
  const stopScheduler = startSchedulerLoop(
    {
      repo: new PgScheduledJobsRepository(queryFn),
      port: getDOSPort(),
      handlers: jobHandlers,
      triggeredBy: 'dos-service',
    },
    Number(process.env.DOS_SCHEDULER_INTERVAL_MS ?? 60_000),
  );
  console.log('[dos-service] scheduler loop running');

  const { app, start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/dos/port/v1', router: dosPortRouter },
      { path: '/api/dos', router: platformHealthRouter },
    ],
    healthChecks: {
      database: async () => {
        try {
          const r = await query('SELECT 1', []);
          return !!r;
        } catch { return false; }
      },
      dosPort: async () => tryGetDOSPort() !== null,
    },
  });
  app.use(dosErrorMiddleware);

  const server = await start();

  const shutdown = async (signal: string) => {
    console.log(`[dos-service] ${signal} received — shutting down`);
    stopScheduler();
    server.close((err) => {
      if (err) {
        console.error('[dos-service] shutdown error', err);
        process.exit(1);
      }
      console.log('[dos-service] HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[dos-service] graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 30000).unref();
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[dos-service] fatal startup error', err);
  process.exit(1);
});
