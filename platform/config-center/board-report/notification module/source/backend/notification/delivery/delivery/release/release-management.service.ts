import { safeQuery } from '@dos/db';
import { publish } from '@dos/platform-core/events';
import { v4 as uuid } from 'uuid';
import type { ReleaseDefinition, ReleaseRiskClass, ReleaseStatus } from '../contracts/delivery.types';

export async function createRelease(input: {
  releaseCode: string;
  version: string;
  riskClass: ReleaseRiskClass;
  affectedLayers: string[];
  affectedProducts: string[];
  affectedModules: string[];
  migrations: string[];
  approvalsRequired: string[];
  smokeTestInventory: string[];
  supportOwner?: string;
  cutoverWindowStart?: string;
  cutoverWindowEnd?: string;
}): Promise<ReleaseDefinition> {
  const releaseId = uuid();
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_releases (
      release_id, release_code, version, risk_class, status,
      affected_layers, affected_products, affected_modules, migrations,
      approvals_required, approvals_met, rollback_plan_id, smoke_test_inventory,
      support_owner, cutover_window_start, cutover_window_end, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,'{}',NULL,$10,$11,$12,$13,$14,$15)`,
    [
      releaseId,
      input.releaseCode,
      input.version,
      input.riskClass,
      JSON.stringify(input.affectedLayers),
      JSON.stringify(input.affectedProducts),
      JSON.stringify(input.affectedModules),
      JSON.stringify(input.migrations),
      JSON.stringify(input.approvalsRequired),
      JSON.stringify(input.smokeTestInventory),
      input.supportOwner ?? null,
      input.cutoverWindowStart ?? null,
      input.cutoverWindowEnd ?? null,
      now,
      now,
    ],
  );
  await publish('delivery.release.created', 'platform', { releaseId, releaseCode: input.releaseCode, version: input.version }, {});
  return getRelease(releaseId) as Promise<ReleaseDefinition>;
}

export async function getRelease(releaseId: string): Promise<ReleaseDefinition | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_releases WHERE release_id = $1 LIMIT 1`,
    [releaseId],
  );
  if (!result.rows[0]) return null;
  return mapReleaseRow(result.rows[0]);
}

export async function getReleaseByCode(releaseCode: string): Promise<ReleaseDefinition | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_releases WHERE release_code = $1 LIMIT 1`,
    [releaseCode],
  );
  if (!result.rows[0]) return null;
  return mapReleaseRow(result.rows[0]);
}

export async function listReleases(status?: ReleaseStatus): Promise<ReleaseDefinition[]> {
  const result = status
    ? await safeQuery(`SELECT * FROM public.dos_releases WHERE status = $1 ORDER BY created_at DESC`, [status])
    : await safeQuery(`SELECT * FROM public.dos_releases ORDER BY created_at DESC`, []);
  return result.rows.map(mapReleaseRow);
}

export async function advanceReleaseStatus(
  releaseId: string,
  newStatus: ReleaseStatus,
  actorId: string,
): Promise<ReleaseDefinition | null> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_releases SET status = $1, updated_at = $2 WHERE release_id = $3`,
    [newStatus, now, releaseId],
  );
  await publish('delivery.release.status_changed', 'platform', { releaseId, newStatus, actorId }, {});
  return getRelease(releaseId);
}

export async function recordApproval(releaseId: string, approverId: string): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_releases
     SET approvals_met = approvals_met || $1::jsonb, updated_at = $2
     WHERE release_id = $3`,
    [JSON.stringify([approverId]), now, releaseId],
  );
  await publish('delivery.release.approval_recorded', 'platform', { releaseId, approverId }, {});
}

export async function attachRollbackPlan(releaseId: string, rollbackPlanId: string): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_releases SET rollback_plan_id = $1, updated_at = $2 WHERE release_id = $3`,
    [rollbackPlanId, now, releaseId],
  );
}

export async function cancelRelease(releaseId: string, actorId: string): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_releases SET status = 'cancelled', updated_at = $1 WHERE release_id = $2`,
    [now, releaseId],
  );
  await publish('delivery.release.cancelled', 'platform', { releaseId, actorId }, {});
}

export async function isReleaseApproved(releaseId: string): Promise<boolean> {
  const release = await getRelease(releaseId);
  if (!release) return false;
  const met = new Set(release.approvalsMet);
  return release.approvalsRequired.every((a) => met.has(a));
}

function mapReleaseRow(row: Record<string, any>): ReleaseDefinition {
  return {
    releaseId: row.release_id as string,
    releaseCode: row.release_code as string,
    version: row.version as string,
    riskClass: row.risk_class as ReleaseRiskClass,
    status: row.status as ReleaseStatus,
    affectedLayers: (row.affected_layers as string[]) ?? [],
    affectedProducts: (row.affected_products as string[]) ?? [],
    affectedModules: (row.affected_modules as string[]) ?? [],
    migrations: (row.migrations as string[]) ?? [],
    approvalsRequired: (row.approvals_required as string[]) ?? [],
    approvalsMet: (row.approvals_met as string[]) ?? [],
    rollbackPlanId: (row.rollback_plan_id as string) ?? null,
    smokeTestInventory: (row.smoke_test_inventory as string[]) ?? [],
    supportOwner: (row.support_owner as string) ?? null,
    cutoverWindowStart: (row.cutover_window_start as string) ?? null,
    cutoverWindowEnd: (row.cutover_window_end as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
