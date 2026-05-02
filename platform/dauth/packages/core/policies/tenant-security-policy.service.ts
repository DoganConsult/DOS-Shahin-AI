import { safeQuery, tenantSchema } from '@dos/db';
import type { SecurityPolicyConfig } from '../types/dauth.types';

const DEFAULT_POLICY: SecurityPolicyConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  sessionTimeoutMinutes: 480,
  mfaRequired: false,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: false,
  passwordExpiryDays: 90,
  invitationExpiryHours: 72,
  delegationMaxDurationHours: 24,
  selfApprovalAllowed: false,
};

export async function getTenantSecurityPolicy(tenantId: string): Promise<SecurityPolicyConfig> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT config FROM "${schema}".tenant_security_policies
       WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1`,
      [tenantId],
    );
    if (rows[0]?.config) {
      return { ...DEFAULT_POLICY, ...rows[0].config };
    }
  } catch (_e) { /* non-critical */ }
  return DEFAULT_POLICY;
}

export async function updateTenantSecurityPolicy(
  tenantId: string,
  patch: Partial<SecurityPolicyConfig>,
  updatedBy: string,
): Promise<SecurityPolicyConfig> {
  const current = await getTenantSecurityPolicy(tenantId);
  const merged = { ...current, ...patch };
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".tenant_security_policies (tenant_id, config, updated_by, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (tenant_id) DO UPDATE
       SET config = EXCLUDED.config, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [tenantId, JSON.stringify(merged), updatedBy],
  );
  return merged;
}

export async function getSecurityPolicyDefaults(): Promise<SecurityPolicyConfig> {
  return DEFAULT_POLICY;
}
