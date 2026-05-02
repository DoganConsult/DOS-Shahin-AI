import { safeQuery, tenantSchema } from '@dos/db';
import { logAuthDecision } from '../audit/decision-log.service';
import { publish } from '../events/publish-with-dsoc';
import type { MakerCheckerDecision } from '../types/dauth.types';

export interface MakerCheckerPolicy {
  entityType: string;
  action: string;
  requiredCheckers: number;
  requireDifferentDepartment: boolean;
  isActive: boolean;
}

export async function getMakerCheckerPolicy(
  tenantId: string,
  entityType: string,
  action: string,
): Promise<MakerCheckerPolicy | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT entity_type, action, required_checkers, require_different_department, is_active
     FROM "${schema}".maker_checker_policies
     WHERE entity_type = $1 AND action = $2 AND is_active = TRUE LIMIT 1`,
    [entityType, action],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    entityType: r.entity_type,
    action: r.action,
    requiredCheckers: r.required_checkers ?? 1,
    requireDifferentDepartment: r.require_different_department === true,
    isActive: true,
  };
}

export async function submitForChecking(
  tenantId: string,
  makerId: string,
  entityType: string,
  entityId: string,
  action: string,
): Promise<MakerCheckerDecision> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".maker_checker_decisions
       (tenant_id, entity_type, entity_id, action, maker_id, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
     RETURNING decision_id, created_at`,
    [tenantId, entityType, entityId, action, makerId],
  );
  await publish('dauth.maker_checker.submitted', tenantId, { entityType, entityId, action, makerId });
  return {
    decisionId: rows[0].decision_id,
    tenantId,
    entityType,
    entityId,
    action,
    makerId,
    checkerId: null,
    status: 'pending',
    createdAt: rows[0].created_at?.toISOString?.() ?? new Date().toISOString(),
    decidedAt: null,
    reason: null,
  };
}

export async function approveDecision(
  tenantId: string,
  decisionId: string,
  checkerId: string,
  reason?: string,
): Promise<{ success: boolean; reason: string }> {
  const schema = tenantSchema(tenantId);

  const { rows: decRows } = await safeQuery(
    `SELECT maker_id, entity_type, action FROM "${schema}".maker_checker_decisions
     WHERE decision_id = $1 AND status = 'pending' LIMIT 1`,
    [decisionId],
  );
  if (!decRows[0]) return { success: false, reason: 'decision_not_found_or_not_pending' };

  if (decRows[0].maker_id === checkerId) {
    await logAuthDecision(tenantId, {
      userId: checkerId,
      permissionCode: `maker_checker:${decRows[0].entity_type}.${decRows[0].action}`,
      decision: 'deny',
      reason: 'maker_cannot_be_checker',
    });
    return { success: false, reason: 'maker_cannot_be_checker' };
  }

  await safeQuery(
    `UPDATE "${schema}".maker_checker_decisions
     SET checker_id = $1, status = 'approved', decided_at = NOW(), reason = $2
     WHERE decision_id = $3`,
    [checkerId, reason ?? null, decisionId],
  );
  await publish('dauth.maker_checker.approved', tenantId, { decisionId, checkerId });
  return { success: true, reason: 'approved' };
}

export async function rejectDecision(
  tenantId: string,
  decisionId: string,
  checkerId: string,
  reason: string,
): Promise<{ success: boolean; reason: string }> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".maker_checker_decisions
     SET checker_id = $1, status = 'rejected', decided_at = NOW(), reason = $2
     WHERE decision_id = $3 AND status = 'pending'`,
    [checkerId, reason, decisionId],
  );
  await publish('dauth.maker_checker.rejected', tenantId, { decisionId, checkerId, reason });
  return { success: true, reason: 'rejected' };
}

export async function getPendingDecisions(tenantId: string): Promise<MakerCheckerDecision[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT decision_id, tenant_id, entity_type, entity_id, action,
            maker_id, checker_id, status, created_at, decided_at, reason
     FROM "${schema}".maker_checker_decisions
     WHERE status = 'pending' ORDER BY created_at ASC`,
    [],
  );
  return rows.map((r: Record<string, unknown>) => {
    const row = r as {
      decision_id: string;
      tenant_id: string;
      entity_type: string;
      entity_id: string;
      action: string;
      maker_id: string;
      checker_id: string | null;
      status: string;
      created_at?: Date | string;
      decided_at?: Date | string | null;
      reason?: string | null;
    };
    const toIso = (v?: Date | string | null): string | null => {
      if (!v) return null;
      return v instanceof Date ? v.toISOString() : String(v);
    };
    return {
      decisionId: row.decision_id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      makerId: row.maker_id,
      checkerId: row.checker_id,
      status: row.status as MakerCheckerDecision['status'],
      createdAt: toIso(row.created_at) ?? '',
      decidedAt: toIso(row.decided_at),
      reason: row.reason ?? null,
    };
  });
}
