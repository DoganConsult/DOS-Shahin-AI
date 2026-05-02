import { safeQuery } from '@dos/db';
import { publish } from '@dos/platform-core/events';
import { v4 as uuid } from 'uuid';
import type { CompatibilityImpact } from '../contracts/delivery.types';

export type CompatibilityClass = 'backward-compatible' | 'forward-compatible' | 'breaking' | 'additive';

export interface CompatibilityRecord {
  compatibilityId: string;
  releaseId: string;
  artifactType: 'api' | 'schema' | 'event' | 'contract' | 'config';
  artifactCode: string;
  changeClass: CompatibilityClass;
  impact: CompatibilityImpact;
  affectedConsumers: string[];
  migrationRequired: boolean;
  deprecationNoticeRequired: boolean;
  breakingChangeApprovalId: string | null;
  notes: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export async function registerCompatibilityRecord(input: {
  releaseId: string;
  artifactType: CompatibilityRecord['artifactType'];
  artifactCode: string;
  changeClass: CompatibilityClass;
  impact: CompatibilityImpact;
  affectedConsumers?: string[];
  migrationRequired?: boolean;
  deprecationNoticeRequired?: boolean;
  breakingChangeApprovalId?: string;
  notes?: string;
}): Promise<CompatibilityRecord> {
  const compatibilityId = uuid();
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_compatibility_records (
      compatibility_id, release_id, artifact_type, artifact_code,
      change_class, impact, affected_consumers,
      migration_required, deprecation_notice_required,
      breaking_change_approval_id, notes, verified_at, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULL,$12)`,
    [
      compatibilityId,
      input.releaseId,
      input.artifactType,
      input.artifactCode,
      input.changeClass,
      input.impact,
      JSON.stringify(input.affectedConsumers ?? []),
      input.migrationRequired ?? false,
      input.deprecationNoticeRequired ?? false,
      input.breakingChangeApprovalId ?? null,
      input.notes ?? null,
      now,
    ],
  );
  return getCompatibilityRecord(compatibilityId) as Promise<CompatibilityRecord>;
}

export async function verifyCompatibilityRecord(
  compatibilityId: string,
  verifiedBy: string,
): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_compatibility_records SET verified_at = $1, notes = COALESCE(notes, '') || ' Verified by: ' || $2 WHERE compatibility_id = $3`,
    [now, verifiedBy, compatibilityId],
  );
  await publish('delivery.compatibility.verified', 'platform', { compatibilityId, verifiedBy }, {});
}

export async function getCompatibilityRecord(compatibilityId: string): Promise<CompatibilityRecord | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_compatibility_records WHERE compatibility_id = $1 LIMIT 1`,
    [compatibilityId],
  );
  if (!result.rows[0]) return null;
  return mapCompatibilityRow(result.rows[0]);
}

export async function listCompatibilityByRelease(releaseId: string): Promise<CompatibilityRecord[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_compatibility_records WHERE release_id = $1 ORDER BY created_at`,
    [releaseId],
  );
  return result.rows.map(mapCompatibilityRow);
}

export async function listBreakingChanges(releaseId: string): Promise<CompatibilityRecord[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_compatibility_records WHERE release_id = $1 AND change_class = 'breaking' ORDER BY created_at`,
    [releaseId],
  );
  return result.rows.map(mapCompatibilityRow);
}

export async function validateBreakingChanges(releaseId: string): Promise<string[]> {
  const breaking = await listBreakingChanges(releaseId);
  const issues: string[] = [];
  for (const record of breaking) {
    if (!record.breakingChangeApprovalId) {
      issues.push(`Breaking change on ${record.artifactCode} (${record.artifactType}) requires approval`);
    }
    if (record.migrationRequired && !record.verifiedAt) {
      issues.push(`Breaking change on ${record.artifactCode} requires migration verification`);
    }
  }
  return issues;
}

function mapCompatibilityRow(row: Record<string, any>): CompatibilityRecord {
  return {
    compatibilityId: row.compatibility_id as string,
    releaseId: row.release_id as string,
    artifactType: row.artifact_type as CompatibilityRecord['artifactType'],
    artifactCode: row.artifact_code as string,
    changeClass: row.change_class as CompatibilityClass,
    impact: row.impact as CompatibilityImpact,
    affectedConsumers: (row.affected_consumers as string[]) ?? [],
    migrationRequired: row.migration_required as boolean,
    deprecationNoticeRequired: row.deprecation_notice_required as boolean,
    breakingChangeApprovalId: (row.breaking_change_approval_id as string) ?? null,
    notes: (row.notes as string) ?? null,
    verifiedAt: (row.verified_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}
