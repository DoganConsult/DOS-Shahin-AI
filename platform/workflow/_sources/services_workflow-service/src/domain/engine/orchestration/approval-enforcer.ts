/**
 * Approval Enforcer — loads module approval matrices and enforces approval decisions.
 *
 * Patch 7 §2.9: Approval model with authority, SoD, self-approval.
 * Law 1: One canonical engine per concern.
 * Law 12: Audit by default — every decision logged.
 */
import { logger } from '@dos/platform-core/observability';
import { safeQuery, tenantSchema } from '@dos/db';

export interface ApprovalMatrix {
  moduleCode: string;
  entityType: string;
  fromStatus: string;
  toStatus: string;
  requiredRole: string;
  authorityLevel: string;
  minApprovals: number;
  selfApprovalAllowed: boolean;
  escalationRole?: string;
  slaHours?: number;
}

export interface ApprovalDecision {
  allowed: boolean;
  reason: string;
  ruleId?: string;
  requiresAdditionalApprovals?: number;
  escalateTo?: string;
}

const tenantCache = new Map<string, { matrices: ApprovalMatrix[]; loadedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function isCacheStale(tenantId: string): boolean {
  const entry = tenantCache.get(tenantId);
  return !entry || (Date.now() - entry.loadedAt) > CACHE_TTL_MS;
}

export async function loadApprovalMatricesForTenant(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT module_code, entity_type, from_status, to_status, required_role,
              authority_level, is_active, metadata
       FROM "${schema}".module_approval_matrices WHERE is_active = true`,
    );
    const matrices: ApprovalMatrix[] = rows.map(( r: Record<string, any>) => {
      const meta = r.metadata || {};
      return {
        moduleCode: r.module_code,
        entityType: r.entity_type,
        fromStatus: r.from_status,
        toStatus: r.to_status,
        requiredRole: r.required_role,
        authorityLevel: r.authority_level ?? 'required',
        minApprovals: meta.min_approvals ?? 1,
        selfApprovalAllowed: meta.self_approval_allowed ?? false,
        escalationRole: meta.escalation_role ?? undefined,
        slaHours: meta.sla_hours ?? undefined,
      };
    });
    tenantCache.set(tenantId, { matrices, loadedAt: Date.now() });
    logger.info(`[ApprovalEnforcer] Loaded ${matrices.length} approval matrices for tenant ${tenantId}`);
  } catch {
    tenantCache.set(tenantId, { matrices: [], loadedAt: Date.now() });
    logger.warn(`[ApprovalEnforcer] module_approval_matrices table not available for tenant ${tenantId}, using empty set`);
  }
}

export function invalidateApprovalCache(tenantId?: string): void {
  if (tenantId) {
    tenantCache.delete(tenantId);
  } else {
    tenantCache.clear();
  }
  logger.info(`[ApprovalEnforcer] Approval matrix cache invalidated${tenantId ? ` for ${tenantId}` : ' (all tenants)'}`);
}

export async function getApprovalMatrices(tenantId: string): Promise<ApprovalMatrix[]> {
  if (isCacheStale(tenantId)) await loadApprovalMatricesForTenant(tenantId);
  return tenantCache.get(tenantId)?.matrices ?? [];
}

export async function findApprovalMatrix(
  tenantId: string,
  moduleCode: string,
  entityType: string,
  fromStatus: string,
  toStatus: string,
): Promise<ApprovalMatrix | undefined> {
  const matrices = await getApprovalMatrices(tenantId);
  return matrices.find(
    (m) => m.moduleCode === moduleCode && m.entityType === entityType && m.fromStatus === fromStatus && m.toStatus === toStatus,
  );
}

export async function enforceApproval(
  tenantId: string,
  moduleCode: string,
  entityType: string,
  fromStatus: string,
  toStatus: string,
  actorUserId: string,
  entityOwnerId?: string,
  existingApprovals: number = 0,
): Promise<ApprovalDecision> {
  const matrix = await findApprovalMatrix(tenantId, moduleCode, entityType, fromStatus, toStatus);

  if (!matrix) {
    return { allowed: true, reason: 'No approval matrix defined for this transition' };
  }

  const ruleId = `${moduleCode}.${entityType}.${fromStatus}_to_${toStatus}`;

  if (!matrix.selfApprovalAllowed && entityOwnerId && actorUserId === entityOwnerId) {
    const decision: ApprovalDecision = {
      allowed: false,
      reason: 'Self-approval is not allowed for this transition',
      ruleId,
      escalateTo: matrix.escalationRole,
    };
    await logApprovalDecision(tenantId, actorUserId, moduleCode, entityType, ruleId, decision);
    return decision;
  }

  const schema = tenantSchema(tenantId);
  const { rows: roleCheck } = await safeQuery(
    `SELECT 1 FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND functional_role_code = $2 AND is_active = true LIMIT 1`,
    [actorUserId, matrix.requiredRole],
  ).catch((err: unknown) => { logger.warn(`[ApprovalEnforcer] Role check query failed for user ${actorUserId}, role ${matrix.requiredRole}: ${err instanceof Error ? err.message : String(err)}`); return { rows: [] }; });

  if (roleCheck.length === 0) {
    const decision: ApprovalDecision = {
      allowed: false,
      reason: `Actor does not have required role '${matrix.requiredRole}'`,
      ruleId,
      escalateTo: matrix.escalationRole,
    };
    await logApprovalDecision(tenantId, actorUserId, moduleCode, entityType, ruleId, decision);
    return decision;
  }

  const totalApprovals = existingApprovals + 1;
  if (totalApprovals < matrix.minApprovals) {
    const decision: ApprovalDecision = {
      allowed: false,
      reason: `Requires ${matrix.minApprovals} approvals, currently have ${totalApprovals}`,
      ruleId,
      requiresAdditionalApprovals: matrix.minApprovals - totalApprovals,
    };
    await logApprovalDecision(tenantId, actorUserId, moduleCode, entityType, ruleId, decision);
    return decision;
  }

  const decision: ApprovalDecision = {
    allowed: true,
    reason: 'Approval requirements satisfied',
    ruleId,
  };
  await logApprovalDecision(tenantId, actorUserId, moduleCode, entityType, ruleId, decision);
  return decision;
}

export async function loadAndRegisterAllApprovalMatrices(): Promise<void> {
  logger.info('[ApprovalEnforcer] Global init — matrices are loaded per-tenant on first access');
}

async function logApprovalDecision(
  tenantId: string,
  actorUserId: string,
  moduleCode: string,
  entityType: string,
  ruleId: string,
  decision: ApprovalDecision,
): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail (user_id, action, entity_type, entity_id, module, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actorUserId,
        decision.allowed ? 'approve' : 'deny',
        entityType,
        ruleId,
        moduleCode,
        JSON.stringify({ ruleId, decision }),
      ],
    );
  } catch (err: unknown) {
    logger.warn(`[ApprovalEnforcer] Failed to log approval decision for ${ruleId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
