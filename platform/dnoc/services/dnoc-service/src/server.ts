/**
 * DNOC service entry point.
 *
 * Bootstraps:
 *   1. Event backbone (Redis-backed) — DNOC can later subscribe to
 *      dnoc.metric/log/span topics if asynchronous ingestion is enabled.
 *   2. DNOCPort with PostgreSQL-backed repositories (5).
 *   3. REST surface at /api/dnoc/port/v1 (1:1 with DNOCPort, 5 endpoints).
 *   4. Health + readiness endpoints at /api/dnoc/{health,ready}.
 *   5. Graceful shutdown on SIGINT / SIGTERM.
 */

import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { query } from '@dos/db';
import dnocPortRouter, {
  wireReadRepositories,
  wireHealthWriter,
} from './routes/port/dnoc-port.routes';
import { bootstrapDNOCPlatformPort } from './bootstrap/dnoc-port.bootstrap';
import {
  tryGetDNOCPort,
  PgMetricsRepository,
  PgTracesRepository,
  PgRoutesRepository,
  PgHealthRepository,
  startDNOCRetentionLoop,
} from '@dos/dnoc-core';
import { dnocErrorMiddleware } from './middleware/error.middleware';
import { Router } from 'express';

// Per-pillar liveness/readiness — consumed by /api/dos/platform/health probe
// fan-out and by the gateway /api/dnoc/* proxy contract.
const dnocPlatformRouter = Router();
dnocPlatformRouter.get('/health', (_req, res) => res.json({ ok: true, service: 'dnoc-service' }));
dnocPlatformRouter.get('/ready',  (_req, res) => res.json({ ok: true, service: 'dnoc-service' }));

const SERVICE_CODE = 'dnoc-service';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  // Event backbone is constructed even though DNOC bootstrap registers
  // no subscribers today — keeps the runtime ready for future async
  // ingestion of dnoc.metric/log/span topics.
  createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
  });

  const queryFn = async (text: string, params: unknown[]) => {
    const result = await query(text, params as any[]);
    return { rows: result.rows };
  };
  bootstrapDNOCPlatformPort({ query: queryFn });
  const metricsRepoForBoot = new PgMetricsRepository(queryFn);
  const healthRepoForBoot = new PgHealthRepository(queryFn);
  wireReadRepositories({
    metrics: metricsRepoForBoot,
    traces: new PgTracesRepository(queryFn),
    routes: new PgRoutesRepository(queryFn),
  });
  wireHealthWriter(healthRepoForBoot);
  console.log('[dnoc-service] bound DNOCPort + read repos wired + health writer wired');

  // ── Retention loop ──
  const metricsDays = Number(process.env.DNOC_METRICS_RETENTION_DAYS ?? 30);
  const logsDays = Number(process.env.DNOC_LOGS_RETENTION_DAYS ?? 14);
  const tracesDays = Number(process.env.DNOC_TRACES_RETENTION_DAYS ?? 7);
  const stopRetention = startDNOCRetentionLoop(
    { query: queryFn },
    { metricsDays, logsDays, tracesDays },
  );
  console.log(
    `[dnoc-service] retention loop: metrics=${metricsDays}d, logs=${logsDays}d, traces=${tracesDays}d`,
  );

  const { app, start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/dnoc',         router: dnocPlatformRouter },
      { path: '/api/dnoc/port/v1', router: dnocPortRouter },
    ],
    healthChecks: {
      database: async () => {
        try {
          const r = await query('SELECT 1', []);
          return !!r;
        } catch { return false; }
      },
      dnocPort: async () => tryGetDNOCPort() !== null,
    },
  });
  app.use(dnocErrorMiddleware);

  const server = await start();

  const shutdown = async (signal: string) => {
    console.log(`[dnoc-service] ${signal} received — shutting down`);
    stopRetention();
    // Flush any buffered metrics so the last batch is durable.
    try {
      await metricsRepoForBoot.forceFlush();
      console.log('[dnoc-service] metrics buffer flushed');
    } catch (err) {
      console.error('[dnoc-service] metrics flush failed on shutdown', err);
    }
    server.close((err) => {
      if (err) {
        console.error('[dnoc-service] shutdown error', err);
        process.exit(1);
      }
      console.log('[dnoc-service] HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[dnoc-service] graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 30000).unref();
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[dnoc-service] fatal startup error', err);
  process.exit(1);
});
