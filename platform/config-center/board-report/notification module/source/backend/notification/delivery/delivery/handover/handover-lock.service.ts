import { safeQuery } from '@dos/db';
import { publish } from '@dos/platform-core/events';
import { v4 as uuid } from 'uuid';
import type { HandoverLock } from '../contracts/delivery.types';

export interface HandoverRiskItem {
  riskId: string;
  releaseId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  owner: string;
  mitigationNotes: string | null;
  carryForward: boolean;
  createdAt: string;
}

export async function createHandoverLock(input: {
  releaseId: string;
}): Promise<HandoverLock> {
  const lockId = uuid();
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_handover_locks (
      lock_id, release_id,
      as_built_updated, migrations_verified, release_notes_finalized,
      known_risks_updated, operational_dashboards_confirmed,
      support_owner_confirmed, cutover_outcome, rollback_outcome,
      locked_at, locked_by, created_at
    ) VALUES ($1,$2,false,false,false,false,false,false,NULL,NULL,NULL,NULL,$3)`,
    [lockId, input.releaseId, now],
  );
  return getHandoverLock(lockId) as Promise<HandoverLock>;
}

export async function updateHandoverChecklist(
  lockId: string,
  updates: Partial<{
    asBuiltUpdated: boolean;
    migrationsVerified: boolean;
    releaseNotesFinalized: boolean;
    knownRisksUpdated: boolean;
    operationalDashboardsConfirmed: boolean;
    supportOwnerConfirmed: boolean;
    cutoverOutcome: string;
    rollbackOutcome: string;
  }>,
): Promise<HandoverLock | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.asBuiltUpdated !== undefined) { fields.push(`as_built_updated = $${idx++}`); values.push(updates.asBuiltUpdated); }
  if (updates.migrationsVerified !== undefined) { fields.push(`migrations_verified = $${idx++}`); values.push(updates.migrationsVerified); }
  if (updates.releaseNotesFinalized !== undefined) { fields.push(`release_notes_finalized = $${idx++}`); values.push(updates.releaseNotesFinalized); }
  if (updates.knownRisksUpdated !== undefined) { fields.push(`known_risks_updated = $${idx++}`); values.push(updates.knownRisksUpdated); }
  if (updates.operationalDashboardsConfirmed !== undefined) { fields.push(`operational_dashboards_confirmed = $${idx++}`); values.push(updates.operationalDashboardsConfirmed); }
  if (updates.supportOwnerConfirmed !== undefined) { fields.push(`support_owner_confirmed = $${idx++}`); values.push(updates.supportOwnerConfirmed); }
  if (updates.cutoverOutcome !== undefined) { fields.push(`cutover_outcome = $${idx++}`); values.push(updates.cutoverOutcome); }
  if (updates.rollbackOutcome !== undefined) { fields.push(`rollback_outcome = $${idx++}`); values.push(updates.rollbackOutcome); }

  if (fields.length === 0) return getHandoverLock(lockId);

  values.push(lockId);
  await safeQuery(
    `UPDATE public.dos_handover_locks SET ${fields.join(', ')} WHERE lock_id = $${idx}`,
    values,
  );
  return getHandoverLock(lockId);
}

export async function lockHandover(lockId: string, lockedBy: string): Promise<HandoverLock | null> {
  const lock = await getHandoverLock(lockId);
  if (!lock) return null;

  const issues = validateHandoverReadiness(lock);
  if (issues.length > 0) {
    throw new Error(`Handover lock blocked: ${issues.join('; ')}`);
  }

  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_handover_locks SET locked_at = $1, locked_by = $2 WHERE lock_id = $3`,
    [now, lockedBy, lockId],
  );
  const updated = await getHandoverLock(lockId);
  if (updated) {
    await publish('delivery.handover.locked', 'platform', {
      lockId,
      releaseId: updated.releaseId,
      lockedBy,
    }, {});
  }
  return updated;
}

export function validateHandoverReadiness(lock: HandoverLock): string[] {
  const issues: string[] = [];
  if (!lock.asBuiltUpdated) issues.push('As-built record must be updated');
  if (!lock.migrationsVerified) issues.push('Migrations must be verified');
  if (!lock.releaseNotesFinalized) issues.push('Release notes must be finalized');
  if (!lock.knownRisksUpdated) issues.push('Known risk register must be updated');
  if (!lock.operationalDashboardsConfirmed) issues.push('Operational dashboards must be confirmed');
  if (!lock.supportOwnerConfirmed) issues.push('Support owner must be confirmed');
  return issues;
}

export async function getHandoverLock(lockId: string): Promise<HandoverLock | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_handover_locks WHERE lock_id = $1 LIMIT 1`,
    [lockId],
  );
  if (!result.rows[0]) return null;
  return mapLockRow(result.rows[0]);
}

export async function getHandoverLockByRelease(releaseId: string): Promise<HandoverLock | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_handover_locks WHERE release_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [releaseId],
  );
  if (!result.rows[0]) return null;
  return mapLockRow(result.rows[0]);
}

export async function registerRiskItem(input: {
  releaseId: string;
  description: string;
  severity: HandoverRiskItem['severity'];
  owner: string;
  mitigationNotes?: string;
  carryForward?: boolean;
}): Promise<HandoverRiskItem> {
  const riskId = uuid();
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_handover_risks (
      risk_id, release_id, description, severity, owner,
      mitigation_notes, carry_forward, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      riskId,
      input.releaseId,
      input.description,
      input.severity,
      input.owner,
      input.mitigationNotes ?? null,
      input.carryForward ?? false,
      now,
    ],
  );
  return getRiskItem(riskId) as Promise<HandoverRiskItem>;
}

export async function getRiskItem(riskId: string): Promise<HandoverRiskItem | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_handover_risks WHERE risk_id = $1 LIMIT 1`,
    [riskId],
  );
  if (!result.rows[0]) return null;
  return mapRiskRow(result.rows[0]);
}

export async function listRisksByRelease(releaseId: string): Promise<HandoverRiskItem[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_handover_risks WHERE release_id = $1 ORDER BY severity DESC, created_at`,
    [releaseId],
  );
  return result.rows.map(mapRiskRow);
}

export async function listCarryForwardRisks(): Promise<HandoverRiskItem[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_handover_risks WHERE carry_forward = true ORDER BY severity DESC, created_at`,
    [],
  );
  return result.rows.map(mapRiskRow);
}

function mapLockRow(row: Record<string, any>): HandoverLock {
  return {
    lockId: row.lock_id as string,
    releaseId: row.release_id as string,
    asBuiltUpdated: row.as_built_updated as boolean,
    migrationsVerified: row.migrations_verified as boolean,
    releaseNotesFinalized: row.release_notes_finalized as boolean,
    knownRisksUpdated: row.known_risks_updated as boolean,
    operationalDashboardsConfirmed: row.operational_dashboards_confirmed as boolean,
    supportOwnerConfirmed: row.support_owner_confirmed as boolean,
    cutoverOutcome: (row.cutover_outcome as string) ?? null,
    rollbackOutcome: (row.rollback_outcome as string) ?? null,
    lockedAt: (row.locked_at as string) ?? null,
    lockedBy: (row.locked_by as string) ?? null,
  };
}

function mapRiskRow(row: Record<string, any>): HandoverRiskItem {
  return {
    riskId: row.risk_id as string,
    releaseId: row.release_id as string,
    description: row.description as string,
    severity: row.severity as HandoverRiskItem['severity'],
    owner: row.owner as string,
    mitigationNotes: (row.mitigation_notes as string) ?? null,
    carryForward: row.carry_forward as boolean,
    createdAt: row.created_at as string,
  };
}
