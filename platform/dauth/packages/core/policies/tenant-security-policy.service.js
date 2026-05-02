"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantSecurityPolicy = getTenantSecurityPolicy;
exports.updateTenantSecurityPolicy = updateTenantSecurityPolicy;
exports.getSecurityPolicyDefaults = getSecurityPolicyDefaults;
const db_1 = require("@dos/db");
const DEFAULT_POLICY = {
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
async function getTenantSecurityPolicy(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT config FROM "${schema}".tenant_security_policies
       WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1`, [tenantId]);
        if (rows[0]?.config) {
            return { ...DEFAULT_POLICY, ...rows[0].config };
        }
    }
    catch (_e) { /* non-critical */ }
    return DEFAULT_POLICY;
}
async function updateTenantSecurityPolicy(tenantId, patch, updatedBy) {
    const current = await getTenantSecurityPolicy(tenantId);
    const merged = { ...current, ...patch };
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".tenant_security_policies (tenant_id, config, updated_by, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (tenant_id) DO UPDATE
       SET config = EXCLUDED.config, updated_by = EXCLUDED.updated_by, updated_at = NOW()`, [tenantId, JSON.stringify(merged), updatedBy]);
    return merged;
}
async function getSecurityPolicyDefaults() {
    return DEFAULT_POLICY;
}
//# sourceMappingURL=tenant-security-policy.service.js.map