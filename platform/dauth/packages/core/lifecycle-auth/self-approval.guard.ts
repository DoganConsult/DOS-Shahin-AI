import { safeQuery, tenantSchema } from '@dos/db';
import { logAuthDecision } from '../audit/decision-log.service';
import { getTenantSecurityPolicy } from '../policies/tenant-security-policy.service';

export interface SelfApprovalCheck {
  allowed: boolean;
  reason: string;
}

export async function checkSelfApproval(
  tenantId: string,
  actorId: string,
  entityType: string,
  entityId: string,
  action: string,
): Promise<SelfApprovalCheck> {
  const policy = await getTenantSecurityPolicy(tenantId);
  if (policy.selfApprovalAllowed) {
    return { allowed: true, reason: 'self_approval_allowed_by_policy' };
  }

  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT created_by FROM "${schema}".${entityType}
     WHERE id = $1 LIMIT 1`,
    [entityId],
  );

  if (!rows[0]) {
    return { allowed: true, reason: 'entity_not_found_skipping_check' };
  }

  if (rows[0].created_by === actorId) {
    await logAuthDecision(tenantId, {
      userId: actorId,
      permissionCode: `self_approval:${entityType}.${action}`,
      decision: 'deny',
      reason: 'self_approval_blocked',
      context: { entityType, entityId, action },
    });
    return { allowed: false, reason: 'self_approval_blocked' };
  }

  return { allowed: true, reason: 'different_actor' };
}

export async function isSelfApprovalAllowed(tenantId: string): Promise<boolean> {
  const policy = await getTenantSecurityPolicy(tenantId);
  return policy.selfApprovalAllowed;
}

export async function getEntityCreator(
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT created_by FROM "${schema}".${entityType} WHERE id = $1 LIMIT 1`,
      [entityId],
    );
    return rows[0]?.created_by ?? null;
  } catch {
    return null;
  }
}
