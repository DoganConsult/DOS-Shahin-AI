/**
 * DSOC service entry point.
 *
 * Bootstraps:
 *   1. Event backbone (Redis-backed) — DSOC subscribes to dsoc.audit.*
 *      and dsoc.alert.* topics emitted by every platform module.
 *   2. DSOCPort with PostgreSQL-backed repositories.
 *   3. 15 backbone subscribers that ingest events into platform_dsoc.*.
 *   4. REST surface at /api/dsoc/port/v1 (1:1 with DSOCPort).
 *   5. Health + readiness endpoints at /api/dsoc/{health,ready}.
 *   6. Graceful shutdown on SIGINT / SIGTERM.
 */

import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { query } from '@dos/db';
import dsocPortRouter, { wireReadRepositories } from './routes/port/dsoc-port.routes';
import { bootstrapDSOCPlatformPort } from './bootstrap/dsoc-port.bootstrap';
import {
  tryGetDSOCPort,
  PgAuditLogRepository,
  PgAlertsRepository,
  PgPostureRepository,
  startDSOCRetentionLoop,
  startPostureLoop,
} from '@dos/dsoc-core';
import { dsocErrorMiddleware } from './middleware/error.middleware';
import { Router } from 'express';

// Per-pillar liveness/readiness — consumed by /api/dos/platform/health probe
// fan-out and by the gateway /api/dsoc/* proxy contract.
const dsocPlatformRouter = Router();
dsocPlatformRouter.get('/health', (_req, res) => res.json({ ok: true, service: 'dsoc-service' }));
dsocPlatformRouter.get('/ready',  (_req, res) => res.json({ ok: true, service: 'dsoc-service' }));

const SERVICE_CODE = 'dsoc-service';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  // ── Event backbone ──
  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
  });

  // Backbone adapter: matches BackboneSubscriber shape from @dos/dsoc-core.
  const backbone = {
    subscribe(eventType: string, subscriberId: string, handler: (event: { tenantId: string; payload: unknown }) => Promise<void>) {
      eventBus.subscribe(eventType, async (envelope: any) => {
        try {
          await handler({ tenantId: envelope.tenantId ?? '', payload: envelope.payload ?? envelope.data ?? {} });
        } catch (err) {
          console.error('[dsoc-service] subscriber error', { eventType, subscriberId, err });
        }
      });
    },
  };

  // ── Bind DSOCPort + register 15 subscribers ──
  const queryFn = async (text: string, params: unknown[]) => {
    const result = await query(text, params as any[]);
    return { rows: result.rows };
  };
  const { subscriberCount } = bootstrapDSOCPlatformPort({ query: queryFn, backbone });
  // Wire read-side repos so the GET endpoints on /api/dsoc/port/v1/{audit-events,alerts} work.
  wireReadRepositories({
    auditLog: new PgAuditLogRepository(queryFn),
    alerts: new PgAlertsRepository(queryFn),
  });
  // Wave 5 / G1.6 — start the Redis Streams consumer loop. Without
  // this, all 15 backbone subscribers above are registered but never
  // dequeue from Redis, so platform_dsoc.audit_log stays empty even
  // when the engine is publishing dsoc.audit.* events. This was the
  // root cause of "DSOC silent for 24h+" reported in Wave 0 baseline.
  eventBus.startConsuming().catch((err: Error) => {
    console.error('[dsoc-service] backbone consumer failed:', err.message);
  });
  console.log(`[dsoc-service] bound DSOCPort + ${subscriberCount} backbone subscribers + read repos wired (consumer loop running)`);

  // ── Retention loop ──
  const auditLogDays = Number(process.env.DSOC_AUDIT_LOG_RETENTION_DAYS ?? 365);
  const resolvedAlertDays = Number(process.env.DSOC_RESOLVED_ALERT_RETENTION_DAYS ?? 90);
  const stopRetention = startDSOCRetentionLoop(
    { query: queryFn },
    { auditLogDays, resolvedAlertDays },
  );
  console.log(`[dsoc-service] retention loop: audit_log ${auditLogDays}d, resolved alerts ${resolvedAlertDays}d`);

  // ── Posture loop ──
  // Hourly scoring of every provisioned tenant against open alerts +
  // recent denied/failed events. Snapshots land in
  // platform_dsoc.posture_snapshots so getLatestPosture() returns real
  // data instead of a 404. Tenant list comes from dos.tenants where
  // status='active'; missing schema is treated as zero tenants so the
  // service still starts cleanly in fresh environments.
  const postureDeps = {
    auditLog: new PgAuditLogRepository(queryFn),
    alerts: new PgAlertsRepository(queryFn),
    posture: new PgPostureRepository(queryFn),
  };
  const tenantSource = async (): Promise<readonly string[]> => {
    try {
      const r = await query(
        `SELECT tenant_id FROM dos.tenants WHERE status = 'active'`,
        [],
      );
      return r.rows.map((row: { tenant_id: string }) => row.tenant_id);
    } catch (err) {
      console.warn('[dsoc-service] tenant list unavailable; posture loop will idle', err);
      return [];
    }
  };
  const stopPosture = startPostureLoop(postureDeps, { tenantSource });
  console.log('[dsoc-service] posture loop started (hourly per active tenant)');

  // ── Server ──
  const { app, start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/dsoc',         router: dsocPlatformRouter },
      { path: '/api/dsoc/port/v1', router: dsocPortRouter },
    ],
    healthChecks: {
      database: async () => {
        try {
          const r = await query('SELECT 1', []);
          return !!r;
        } catch { return false; }
      },
      dsocPort: async () => tryGetDSOCPort() !== null,
    },
  });
  // Error middleware — last, after all routes.
  app.use(dsocErrorMiddleware);

  const server = await start();

  // ── Graceful shutdown ──
  const shutdown = async (signal: string) => {
    console.log(`[dsoc-service] ${signal} received — shutting down`);
    stopRetention();
    stopPosture();
    server.close((err) => {
      if (err) {
        console.error('[dsoc-service] shutdown error', err);
        process.exit(1);
      }
      console.log('[dsoc-service] HTTP server closed');
      process.exit(0);
    });
    // Force-kill after 30s if connections won't drain.
    setTimeout(() => {
      console.error('[dsoc-service] graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 30000).unref();
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[dsoc-service] fatal startup error', err);
  process.exit(1);
});
