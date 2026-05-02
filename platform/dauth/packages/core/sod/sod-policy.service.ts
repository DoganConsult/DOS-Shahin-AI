import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';

export interface SodPolicy {
  policyId: string;
  ruleCode: string;
  roleCodeA: string;
  roleCodeB: string;
  conflictLevel: 'critical' | 'high' | 'medium';
  enforcement: 'block' | 'warn' | 'log';
  moduleCode: string | null;
  description: string;
  isActive: boolean;
  temporaryWaiverAllowed: boolean;
  waiverMaxDays: number | null;
}

export async function getSodPolicies(tenantId: string, moduleCode?: string): Promise<SodPolicy[]> {
  const schema = tenantSchema(tenantId);
  const filter = moduleCode ? `AND (module_code = $1 OR module_code IS NULL)` : '';
  const params: unknown[] = moduleCode ? [moduleCode] : [];
  const { rows } = await safeQuery(
    `SELECT policy_id, rule_code, role_code_a, role_code_b, conflict_level,
            enforcement, module_code, description, is_active,
            temporary_waiver_allowed, waiver_max_days
     FROM "${schema}".sod_rules
     WHERE is_active = TRUE ${filter}
     ORDER BY conflict_level DESC, rule_code`,
    params,
  );
  return rows.map((r: any) => ({
    policyId: r.policy_id ?? r.rule_code,
    ruleCode: r.rule_code,
    roleCodeA: r.role_code_a,
    roleCodeB: r.role_code_b,
    conflictLevel: r.conflict_level,
    enforcement: r.enforcement ?? 'block',
    moduleCode: r.module_code,
    description: r.description ?? '',
    isActive: true,
    temporaryWaiverAllowed: r.temporary_waiver_allowed === true,
    waiverMaxDays: r.waiver_max_days,
  }));
}

export async function createSodPolicy(
  tenantId: string,
  policy: Omit<SodPolicy, 'policyId' | 'isActive'>,
  createdBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".sod_rules
       (rule_code, role_code_a, role_code_b, conflict_level, enforcement,
        module_code, description, is_active, temporary_waiver_allowed, waiver_max_days, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10)`,
    [
      policy.ruleCode, policy.roleCodeA, policy.roleCodeB,
      policy.conflictLevel, policy.enforcement, policy.moduleCode,
      policy.description, policy.temporaryWaiverAllowed,
      policy.waiverMaxDays, createdBy,
    ],
  );
  await publish('dauth.sod.policy_created', tenantId, { ruleCode: policy.ruleCode, createdBy });
}

export async function deactivateSodPolicy(
  tenantId: string,
  ruleCode: string,
  deactivatedBy: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".sod_rules SET is_active = FALSE, updated_at = NOW()
     WHERE rule_code = $1 AND is_active = TRUE`,
    [ruleCode],
  );
  if ((result.rowCount ?? 0) > 0) {
    await publish('dauth.sod.policy_deactivated', tenantId, { ruleCode, deactivatedBy });
    return true;
  }
  return false;
}

export async function grantSodWaiver(
  tenantId: string,
  userId: string,
  ruleCode: string,
  durationDays: number,
  grantedBy: string,
  reason: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const policies = await getSodPolicies(tenantId);
  const policy = policies.find(p => p.ruleCode === ruleCode);
  if (!policy || !policy.temporaryWaiverAllowed) return false;
  if (policy.waiverMaxDays && durationDays > policy.waiverMaxDays) return false;

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60_000);
  await safeQuery(
    `INSERT INTO "${schema}".sod_waivers
       (user_id, rule_code, expires_at, granted_by, reason, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [userId, ruleCode, expiresAt, grantedBy, reason],
  );
  await publish('dauth.sod.waiver_granted', tenantId, { userId, ruleCode, durationDays, grantedBy });
  return true;
}
