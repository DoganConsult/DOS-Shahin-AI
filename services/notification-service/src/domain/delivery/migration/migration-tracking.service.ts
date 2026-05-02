import { safeQuery } from '@dos/db';
import { publishEvent as _pe } from '@dos/module-sdk';
const publish = (eventType: string, _module: string, payload: any, _meta?: any) => _pe({ eventType, payload } as any);
import { v4 as uuid } from 'uuid';
import type { MigrationRecord, MigrationType, MigrationStatus, CompatibilityImpact } from '../contracts/delivery.types';

export async function registerMigration(input: {
  releaseId?: string;
  migrationType: MigrationType;
  reversible: boolean;
  compatibilityImpact: CompatibilityImpact;
  affectedSchemas?: string[];
  affectedTables?: string[];
  validationSteps?: string[];
  rollbackNotes?: string;
  tenantImpact?: string;
  irreversibleApprovalId?: string;
  tenantId?: string;
}): Promise<MigrationRecord> {
  const migrationId = uuid();
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_migrations (
      migration_id, release_id, migration_type, status, reversible,
      compatibility_impact, affected_schemas, affected_tables,
      validation_steps, rollback_notes, tenant_impact,
      irreversible_approval_id, tenant_id,
      started_at, completed_at, failed_at, failure_reason, created_at
    ) VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL,NULL,NULL,NULL,$13)`,
    [
      migrationId,
      input.releaseId ?? null,
      input.migrationType,
      input.reversible,
      input.compatibilityImpact,
      JSON.stringify(input.affectedSchemas ?? []),
      JSON.stringify(input.affectedTables ?? []),
      JSON.stringify(input.validationSteps ?? []),
      input.rollbackNotes ?? null,
      input.tenantImpact ?? null,
      input.irreversibleApprovalId ?? null,
      input.tenantId ?? null,
      now,
    ],
  );
  await publish('delivery.migration.registered', input.tenantId ?? 'platform', { migrationId, migrationType: input.migrationType }, {});
  return getMigration(migrationId) as Promise<MigrationRecord>;
}

export async function startMigration(migrationId: string): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_migrations SET status = 'running', started_at = $1 WHERE migration_id = $2`,
    [now, migrationId],
  );
  const migration = await getMigration(migrationId);
  await publish('delivery.migration.started', migration?.tenantId ?? 'platform', { migrationId }, {});
}

export async function completeMigration(migrationId: string): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_migrations SET status = 'completed', completed_at = $1 WHERE migration_id = $2`,
    [now, migrationId],
  );
  const migration = await getMigration(migrationId);
  await publish('delivery.migration.completed', migration?.tenantId ?? 'platform', { migrationId }, {});
}

export async function failMigration(migrationId: string, reason: string): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_migrations SET status = 'failed', failed_at = $1, failure_reason = $2 WHERE migration_id = $3`,
    [now, reason, migrationId],
  );
  const migration = await getMigration(migrationId);
  await publish('delivery.migration.failed', migration?.tenantId ?? 'platform', { migrationId, reason }, {});
}

export async function skipMigration(migrationId: string): Promise<void> {
  await safeQuery(
    `UPDATE public.dos_migrations SET status = 'skipped' WHERE migration_id = $1`,
    [migrationId],
  );
}

export async function getMigration(migrationId: string): Promise<MigrationRecord | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_migrations WHERE migration_id = $1 LIMIT 1`,
    [migrationId],
  );
  if (!result.rows[0]) return null;
  return mapMigrationRow(result.rows[0]);
}

export async function listMigrationsByRelease(releaseId: string): Promise<MigrationRecord[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_migrations WHERE release_id = $1 ORDER BY created_at`,
    [releaseId],
  );
  return result.rows.map(mapMigrationRow);
}

export async function listPendingMigrations(tenantId?: string): Promise<MigrationRecord[]> {
  const result = tenantId
    ? await safeQuery(
        `SELECT * FROM public.dos_migrations WHERE status IN ('pending','running') AND tenant_id = $1 ORDER BY created_at`,
        [tenantId],
      )
    : await safeQuery(
        `SELECT * FROM public.dos_migrations WHERE status IN ('pending','running') ORDER BY created_at`,
        [],
      );
  return result.rows.map(mapMigrationRow);
}

export async function listFailedMigrations(): Promise<MigrationRecord[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_migrations WHERE status = 'failed' ORDER BY failed_at DESC`,
    [],
  );
  return result.rows.map(mapMigrationRow);
}

export function validateMigrationSafety(migration: MigrationRecord): string[] {
  const issues: string[] = [];
  if (!migration.reversible && !migration.irreversibleApprovalId) {
    issues.push('Irreversible migration requires approval ID');
  }
  if (migration.compatibilityImpact === 'high' && !migration.rollbackNotes) {
    issues.push('High compatibility impact migration requires rollback notes');
  }
  if (migration.validationSteps.length === 0) {
    issues.push('Migration must define at least one validation step');
  }
  return issues;
}

function mapMigrationRow(row: Record<string, any>): MigrationRecord {
  return {
    migrationId: row.migration_id as string,
    releaseId: (row.release_id as string) ?? null,
    migrationType: row.migration_type as MigrationType,
    status: row.status as MigrationStatus,
    reversible: row.reversible as boolean,
    compatibilityImpact: row.compatibility_impact as CompatibilityImpact,
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
