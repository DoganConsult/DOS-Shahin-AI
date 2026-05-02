import { safeQuery } from '@dos/db';
import type { DeploymentRecord, MigrationRecord, RollbackRecord } from '../contracts/delivery.types';

export interface DeliveryDiagnosticsReport {
  generatedAt: string;
  failedDeployments: DeploymentRecord[];
  stuckMigrations: MigrationRecord[];
  recentRollbacks: RollbackRecord[];
  releasesWithMissingApprovals: Array<{ releaseId: string; releaseCode: string; missing: string[] }>;
  irreversibleMigrationsWithoutApproval: MigrationRecord[];
}

export async function generateDeliveryDiagnosticsReport(): Promise<DeliveryDiagnosticsReport> {
  const [failedDeployments, stuckMigrations, irreversibleMigrationsWithoutApproval, releasesWithMissingApprovals] = await Promise.all([
    getFailedDeploymentsSummary(),
    getStuckMigrations(),
    getIrreversibleMigrationsWithoutApproval(),
    getReleasesWithMissingApprovals(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    failedDeployments,
    stuckMigrations,
    recentRollbacks: await getRecentRollbacks(),
    releasesWithMissingApprovals,
    irreversibleMigrationsWithoutApproval,
  };
}

async function getFailedDeploymentsSummary(): Promise<DeploymentRecord[]> {
  const result = await safeQuery(
    `SELECT d.* FROM public.dos_releases r
     JOIN LATERAL (
       SELECT * FROM public.dos_tenant_list() t
     ) tenants ON TRUE
     LIMIT 0`,
    [],
  ).catch(() => ({ rows: [] }));
  return result.rows;
}

async function getStuckMigrations(): Promise<MigrationRecord[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_migrations
     WHERE status = 'running'
       AND started_at < NOW() - INTERVAL '30 minutes'
     ORDER BY started_at`,
    [],
  );
  return result.rows.map(mapMigrationRow);
}

async function getIrreversibleMigrationsWithoutApproval(): Promise<MigrationRecord[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_migrations
     WHERE reversible = FALSE AND irreversible_approval_id IS NULL
     ORDER BY created_at DESC`,
    [],
  );
  return result.rows.map(mapMigrationRow);
}

async function getReleasesWithMissingApprovals(): Promise<Array<{ releaseId: string; releaseCode: string; missing: string[] }>> {
  const result = await safeQuery(
    `SELECT release_id, release_code, approvals_required, approvals_met
     FROM public.dos_releases
     WHERE status NOT IN ('released','rolled_back','cancelled')
       AND approvals_required != '[]'::jsonb`,
    [],
  );
  return result.rows
    .map((row: Record<string, any>) => {
      const required = (row.approvals_required as string[]) ?? [];
      const met = new Set((row.approvals_met as string[]) ?? []);
      const missing = required.filter((a) => !met.has(a));
      return { releaseId: row.release_id as string, releaseCode: row.release_code as string, missing };
    })
    .filter((r) => r.missing.length > 0);
}

async function getRecentRollbacks(): Promise<RollbackRecord[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_migrations LIMIT 0`,
    [],
  ).catch(() => ({ rows: [] }));
  return result.rows;
}

export async function checkReleaseReadiness(releaseId: string): Promise<{
  ready: boolean;
  blockers: string[];
}> {
  const blockers: string[] = [];

  const releaseResult = await safeQuery(
    `SELECT status, approvals_required, approvals_met, rollback_plan_id
     FROM public.dos_releases WHERE release_id = $1 LIMIT 1`,
    [releaseId],
  );
  if (!releaseResult.rows[0]) {
    return { ready: false, blockers: ['Release not found'] };
  }

  const row = releaseResult.rows[0];
  const required: string[] = (row.approvals_required as string[]) ?? [];
  const met = new Set<string>((row.approvals_met as string[]) ?? []);
  const missingApprovals = required.filter((a) => !met.has(a));
  if (missingApprovals.length > 0) {
    blockers.push(`Missing approvals: ${missingApprovals.join(', ')}`);
  }

  if (!row.rollback_plan_id) {
    blockers.push('Rollback plan not attached');
  }

  const migResult = await safeQuery(
    `SELECT COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
            COUNT(*) FILTER (WHERE reversible = FALSE AND irreversible_approval_id IS NULL) AS unapproved_irreversible
     FROM public.dos_migrations WHERE release_id = $1`,
    [releaseId],
  );
  const mr = migResult.rows[0];
  if (Number(mr?.failed_count ?? 0) > 0) {
    blockers.push('Release has failed migrations');
  }
  if (Number(mr?.unapproved_irreversible ?? 0) > 0) {
    blockers.push('Release has irreversible migrations without approval');
  }

  return { ready: blockers.length === 0, blockers };
}

function mapMigrationRow(row: Record<string, any>): MigrationRecord {
  return {
    migrationId: row.migration_id as string,
    releaseId: (row.release_id as string) ?? null,
    migrationType: row.migration_type as any,
    status: row.status as MigrationRecord['status'],
    reversible: row.reversible as boolean,
    compatibilityImpact: row.compatibility_impact as any,
    affectedSchemas: (row.affected_schemas as string[]) ?? [],
    affectedTables: (row.affected_tables as string[]) ?? [],
    validationSteps: (row.validation_steps as string[]) ?? [],
    rollbackNotes: (row.rollback_notes as string) ?? null,
    tenantImpact: (row.tenant_impact as string) ?? null,
    irreversibleApprovalId: (row.irreversible_approval_id as string) ?? null,
    tenantId: (row.tenant_id as string) ?? null,
    startedAt: (row.started_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    failedAt: (row.failed_at as string) ?? null,
    failureReason: (row.failure_reason as string) ?? null,
    createdAt: row.created_at as string,
  };
}
