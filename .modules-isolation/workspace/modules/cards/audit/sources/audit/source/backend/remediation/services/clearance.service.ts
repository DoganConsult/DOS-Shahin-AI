import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';

const CLEARANCE_HIERARCHY: Record<string, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
  top_secret: 4,
};

const ROLE_BASE_CLEARANCE: Record<string, number> = {
  viewer: 1,
  analyst: 2,
  compliance_officer: 3,
  risk_manager: 3,
  auditor: 3,
  admin: 4,
  owner: 4,
  super_admin: 4,
  tenant_admin: 4,
};

export async function getUserClearanceLevel(tenantId: string, userId: string, role: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT MAX(dc.sensitivity_level) AS max_level
     FROM "${schema}".data_classifications dc
     INNER JOIN "${schema}".rbac_role_permissions rp ON rp.permission_code LIKE 'data_classification.' || dc.code || '.%'
     INNER JOIN "${schema}".rbac_user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1 AND dc.deleted_at IS NULL`,
    [userId],
  );
  const dbLevel = getFirstRow(result)?.max_level;
  if (dbLevel !== null && dbLevel !== undefined) return dbLevel;
  return ROLE_BASE_CLEARANCE[role] ?? 1;
}

export async function getEntityClassificationLevel(tenantId: string, entityType: string, entityId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const tableMap: Record<string, { table: string; idCol: string; classCol: string }> = {
    remediation_task: { table: 'remediation_tasks', idCol: 'task_id', classCol: 'data_classification' },
    remediation_plan: { table: 'remediation_plans', idCol: 'plan_id', classCol: 'data_classification' },
    risk: { table: 'risks', idCol: 'risk_id', classCol: 'data_classification' },
    control: { table: 'controls', idCol: 'control_id', classCol: 'data_classification' },
    policy: { table: 'policies', idCol: 'policy_id', classCol: 'data_classification' },
    evidence: { table: 'evidence', idCol: 'evidence_id', classCol: 'data_classification' },
    incident: { table: 'incidents', idCol: 'incident_id', classCol: 'data_classification' },
  };
  const mapping = tableMap[entityType];
  if (!mapping) return CLEARANCE_HIERARCHY['internal'] ?? 1;

  const result = await safeQuery(
    `SELECT COALESCE(${mapping.classCol}, 'internal') AS classification
     FROM "${schema}".${mapping.table}
     WHERE ${mapping.idCol} = $1 AND deleted_at IS NULL`,
    [entityId],
  );
  const classification = getFirstRow(result)?.classification || 'internal';
  return CLEARANCE_HIERARCHY[classification] ?? 1;
}

export async function canAccessConfidentiality(role: string, confidentialityLevel: string): Promise<boolean> {
  const userClearance = ROLE_BASE_CLEARANCE[role] ?? 1;
  const requiredClearance = CLEARANCE_HIERARCHY[confidentialityLevel] ?? 1;
  return userClearance >= requiredClearance;
}

export async function canAccessEntity(
  tenantId: string, userId: string, role: string, entityType: string, entityId: string,
): Promise<{ allowed: boolean; userLevel: number; requiredLevel: number }> {
  const [userLevel, requiredLevel] = await Promise.all([
    getUserClearanceLevel(tenantId, userId, role),
    getEntityClassificationLevel(tenantId, entityType, entityId),
  ]);
  return { allowed: userLevel >= requiredLevel, userLevel, requiredLevel };
}

export async function auditClearanceCheck(
  tenantId: string, userId: string, entityType: string, entityId: string, allowed: boolean,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId,
      module: 'remediation',
      action: allowed ? 'clearance_granted' : 'clearance_denied',
      entityType,
      entityId,
    });
  } catch { /* best-effort audit */ }
}

export async function enforceClearance(
  tenantId: string, userId: string, role: string, entityType: string, entityId: string,
): Promise<boolean> {
  const { allowed } = await canAccessEntity(tenantId, userId, role, entityType, entityId);
  await auditClearanceCheck(tenantId, userId, entityType, entityId, allowed);
  return allowed;
}

// ── Clearance-level hierarchy for SQL-safe filtering ──────────────────────

const ROLE_CLEARANCE: Record<string, number> = {
  ADMIN: 4, OWNER: 4,
  MANAGER: 3, COMPLIANCE_OFFICER: 3,
  AUDITOR: 2, USER: 2,
  VIEWER: 1,
};

/**
 * Build a SQL WHERE clause fragment that filters rows by the caller's
 * clearance level. Returns an object with `clause` (SQL) and `params`.
 * `paramOffset` is the $N index to start from (default 1).
 */
export function getClearanceFilterHierarchy(
  role: string,
  columnName: string = 'confidentiality_level',
  paramOffset: number = 1,
): { clause: string; params: unknown[]; condition: string; paramValue: number } {
  const maxLevel = ROLE_CLEARANCE[role?.toUpperCase()] ?? 1;
  const condition = `COALESCE(${columnName}, 0) <= $${paramOffset}`;
  return {
    clause: condition,
    condition,
    params: [maxLevel],
    paramValue: maxLevel,
  };
}
