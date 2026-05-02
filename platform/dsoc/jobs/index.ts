/**
 * DSOC pillar — scheduled job registry.
 *
 * Single declarative call-site for every cron/interval owned by the
 * Dogan Security Operations Center. Imported by the platform scheduler
 * bootstrap during the Jobs phase of server startup.
 *
 * Today, DSOC owns TWO recurring jobs:
 *
 *   ┌─────────────────────────────────┬──────────────┬─────────────────────────────┐
 *   │ Job                             │ Cadence      │ Effect                      │
 *   ├─────────────────────────────────┼──────────────┼─────────────────────────────┤
 *   │ dsoc.retention.prune            │ every 6h     │ DELETE rows from            │
 *   │                                 │              │ platform_dsoc.audit_log     │
 *   │                                 │              │ and platform_dsoc.alerts    │
 *   │                                 │              │ older than                  │
 *   │                                 │              │ DSOC_AUDIT_LOG_RETENTION_   │
 *   │                                 │              │ DAYS / DSOC_RESOLVED_ALERT_ │
 *   │                                 │              │ RETENTION_DAYS.             │
 *   ├─────────────────────────────────┼──────────────┼─────────────────────────────┤
 *   │ dsoc.posture.compute            │ hourly       │ Compute + persist a posture │
 *   │                                 │              │ snapshot per provisioned    │
 *   │                                 │              │ tenant in                   │
 *   │                                 │              │ platform_dsoc.posture_      │
 *   │                                 │              │ snapshots. Deps: auditLog,  │
 *   │                                 │              │ alerts, posture repos +     │
 *   │                                 │              │ tenantSource().             │
 *   └─────────────────────────────────┴──────────────┴─────────────────────────────┘
 *
 * Wiring today:
 *   • dsoc.retention.prune — runs via `startDSOCRetentionLoop` setInterval
 *     in `dsoc-service/src/server.ts`. `registerDSOCJobs()` exposes the
 *     same work to the platform scheduler so the bootstrap can switch
 *     from setInterval to scheduler-tracked execution without changing
 *     the cadence.
 *   • dsoc.posture.compute — exported from `@dos/dsoc-core` as
 *     `startPostureLoop`, but NOT currently bound at startup. The
 *     bootstrap that owns the AuditLog/Alerts/Posture repos and the
 *     tenant source is the right place to call
 *     `registerDSOCPostureJob(deps)` below.
 *
 * Adding a new job:
 *   1. Add a row to DSOC_JOBS or expose a deps-bound registrar like
 *      registerDSOCPostureJob.
 *   2. Update `metadata.scheduledJobs` in
 *      `platform/dsoc/module.manifest.json`.
 */

import { registerJob } from '@dos/platform-core/jobs';
import {
  runDSOCRetention,
  computePostureSnapshot,
  type PostureJobDeps,
} from '@dos/dsoc-core';
import { query } from '@dos/db';

export interface DSOCJobDefinition {
  readonly name: string;
  readonly cron: string;
  readonly description: string;
  readonly handler: () => Promise<void>;
}

const queryFn = async (text: string, params: unknown[]) => {
  const result = await query(text, params as unknown[]);
  return { rows: result.rows };
};

const retentionDays = (envKey: string, fallback: number): number => {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Self-contained jobs that need only `query` from @dos/db.
 * Mirror this list in `platform/dsoc/module.manifest.json`
 * → `metadata.scheduledJobs`.
 */
export const DSOC_JOBS: ReadonlyArray<DSOCJobDefinition> = Object.freeze([
  {
    name: 'dsoc.retention.prune',
    cron: '0 */6 * * *',
    description:
      'Prune platform_dsoc.audit_log + resolved alerts beyond DSOC_*_RETENTION_DAYS every 6 hours.',
    handler: async (): Promise<void> => {
      const result = await runDSOCRetention(
        { query: queryFn },
        {
          auditLogDays: retentionDays('DSOC_AUDIT_LOG_RETENTION_DAYS', 365),
          resolvedAlertDays: retentionDays('DSOC_RESOLVED_ALERT_RETENTION_DAYS', 90),
        },
      );
      console.log(
        `[dsoc.retention.prune] deleted audit_log=${result.auditLogDeleted} ` +
          `alerts=${result.alertsDeleted}`,
      );
    },
  },
]);

/**
 * Register every self-contained DSOC pillar job with the platform
 * scheduler. Idempotent at the scheduler layer.
 */
export async function registerDSOCJobs(): Promise<readonly string[]> {
  const registered: string[] = [];
  for (const job of DSOC_JOBS) {
    await registerJob(job.name, job.cron, job.handler);
    registered.push(job.name);
  }
  console.log(`[platform/dsoc/jobs] registered ${registered.length} self-contained job(s)`);
  return registered;
}

export interface PostureJobBootstrap {
  readonly deps: PostureJobDeps;
  readonly tenantSource: () => Promise<readonly string[]>;
  readonly lookbackEvents?: number;
}

/**
 * Register the deps-bound posture-computation job with the platform
 * scheduler. Call this from the dsoc-service bootstrap once the
 * AuditLog / Alerts / Posture repositories are constructed and a
 * tenant-list source is available.
 *
 * Cadence is hourly; snapshots are persisted to
 * platform_dsoc.posture_snapshots per provisioned tenant.
 */
export async function registerDSOCPostureJob(boot: PostureJobBootstrap): Promise<string> {
  const name = 'dsoc.posture.compute';
  await registerJob(name, '0 * * * *', async () => {
    const tenants = await boot.tenantSource();
    let ok = 0;
    let failed = 0;
    for (const tenantId of tenants) {
      try {
        await computePostureSnapshot(boot.deps, tenantId, {
          lookbackEvents: boot.lookbackEvents,
        });
        ok++;
      } catch {
        failed++;
      }
    }
    if (ok > 0 || failed > 0) {
      console.log(
        `[dsoc.posture.compute] computed=${ok} failed=${failed} for ${tenants.length} tenants`,
      );
    }
  });
  console.log('[platform/dsoc/jobs] registered dsoc.posture.compute');
  return name;
}

/**
 * Synchronous inventory for /api/dos/platform/jobs/registry-style
 * health probes. Returns the names of every DSOC-owned job, including
 * deps-bound jobs that need explicit `registerDSOCPostureJob(...)`.
 */
export function listDSOCJobNames(): readonly string[] {
  return Object.freeze([...DSOC_JOBS.map((j) => j.name), 'dsoc.posture.compute']);
}
