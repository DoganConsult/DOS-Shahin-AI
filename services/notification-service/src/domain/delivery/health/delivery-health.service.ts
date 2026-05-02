import { safeQuery } from '@dos/db';
import type { DeliveryHealthSnapshot } from '../contracts/delivery.types';

export async function getDeliveryHealthSnapshot(tenantId?: string): Promise<DeliveryHealthSnapshot> {
  const now = new Date().toISOString();

  const releaseResult = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE status NOT IN ('released','rolled_back','cancelled')) AS active_releases
     FROM public.dos_releases`,
    [],
  );

  const migrationResult = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('pending','running')) AS pending_migrations,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed_migrations
     FROM public.dos_migrations${tenantId ? ' WHERE tenant_id = $1' : ''}`,
    tenantId ? [tenantId] : [],
  );

  let deploymentResult;
  if (tenantId) {
    const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
    deploymentResult = await safeQuery(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'completed') AS successful,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed,
         COUNT(*) FILTER (WHERE status = 'rolled_back') AS rolled_back
       FROM "${schema}".dos_deployments`,
      [],
    ).catch(() => ({ rows: [{ total: 0, successful: 0, failed: 0, rolled_back: 0 }] }));
  } else {
    deploymentResult = { rows: [{ total: 0, successful: 0, failed: 0, rolled_back: 0 }] };
  }

  const dr = deploymentResult.rows[0];
  const total = Number(dr?.total ?? 0);
  const successful = Number(dr?.successful ?? 0);
  const failed = Number(dr?.failed ?? 0);
  const rolledBack = Number(dr?.rolled_back ?? 0);
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;
  const rollbackRate = total > 0 ? Math.round((rolledBack / total) * 100) : 0;

  const mr = migrationResult.rows[0];

  return {
    snapshotAt: now,
    totalDeployments: total,
    successfulDeployments: successful,
    failedDeployments: failed,
    rolledBackDeployments: rolledBack,
    successRate,
    rollbackRate,
    activeReleases: Number(releaseResult.rows[0]?.active_releases ?? 0),
    pendingMigrations: Number(mr?.pending_migrations ?? 0),
    failedMigrations: Number(mr?.failed_migrations ?? 0),
  };
}

export async function getDeploymentSuccessRateByEnvironment(tenantId: string, environment: string): Promise<number> {
  const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
  const result = await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'completed') AS successful
     FROM "${schema}".dos_deployments WHERE environment = $1`,
    [environment],
  ).catch(() => ({ rows: [{ total: 0, successful: 0 }] }));
  const total = Number(result.rows[0]?.total ?? 0);
  const successful = Number(result.rows[0]?.successful ?? 0);
  return total > 0 ? Math.round((successful / total) * 100) : 100;
}

export async function getMigrationHealthByRelease(releaseId: string): Promise<{
  total: number;
  completed: number;
  pending: number;
  failed: number;
  skipped: number;
}> {
  const result = await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status IN ('pending','running')) AS pending,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed,
       COUNT(*) FILTER (WHERE status = 'skipped') AS skipped
     FROM public.dos_migrations WHERE release_id = $1`,
    [releaseId],
  );
  const r = result.rows[0] ?? {};
  return {
    total: Number(r.total ?? 0),
    completed: Number(r.completed ?? 0),
    pending: Number(r.pending ?? 0),
    failed: Number(r.failed ?? 0),
    skipped: Number(r.skipped ?? 0),
  };
}
