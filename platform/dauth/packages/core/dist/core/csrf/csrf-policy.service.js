"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCsrfPolicy = getCsrfPolicy;
exports.updateCsrfPolicy = updateCsrfPolicy;
exports.getCsrfPolicyDefaults = getCsrfPolicyDefaults;
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const resilience_1 = require("@dos/platform-core/resilience");
const DEFAULT_CSRF_POLICY = {
    tokenMaxAgeMs: 4 * 60 * 60 * 1000, // 4 hours
    rotationIntervalMs: 60_000, // 1 minute
    graceWindowMs: 5_000, // 5 seconds
    enforcementMode: 'block',
    sameIpRequired: false,
    sameUaRequired: true,
    maxFailuresPerWindow: 10,
    failureWindowMs: 5 * 60 * 1000, // 5 minutes
};
function mapRow(row) {
    return {
        tokenMaxAgeMs: row.token_max_age_ms,
        rotationIntervalMs: row.rotation_interval_ms,
        graceWindowMs: row.grace_window_ms,
        enforcementMode: row.enforcement_mode,
        sameIpRequired: row.same_ip_required,
        sameUaRequired: row.same_ua_required,
        maxFailuresPerWindow: row.max_failures_per_window,
        failureWindowMs: row.failure_window_ms,
    };
}
/** Read per-tenant CSRF policy. Falls back to defaults if none configured. */
async function getCsrfPolicy(tenantId) {
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM csrf_security_policies
       WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1`, [tenantId]);
        if (rows[0]) {
            return { ...DEFAULT_CSRF_POLICY, ...mapRow(rows[0]) };
        }
    }
    catch (_e) { /* non-critical */ }
    return DEFAULT_CSRF_POLICY;
}
/** Upsert per-tenant CSRF policy. Publishes event on change. */
async function updateCsrfPolicy(tenantId, patch, updatedBy) {
    const current = await getCsrfPolicy(tenantId);
    const merged = { ...current, ...patch };
    await (0, db_1.safeQuery)(`INSERT INTO csrf_security_policies
       (tenant_id, token_max_age_ms, rotation_interval_ms, grace_window_ms,
        enforcement_mode, same_ip_required, same_ua_required,
        max_failures_per_window, failure_window_ms, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $10)
     ON CONFLICT (tenant_id) DO UPDATE SET
       token_max_age_ms = EXCLUDED.token_max_age_ms,
       rotation_interval_ms = EXCLUDED.rotation_interval_ms,
       grace_window_ms = EXCLUDED.grace_window_ms,
       enforcement_mode = EXCLUDED.enforcement_mode,
       same_ip_required = EXCLUDED.same_ip_required,
       same_ua_required = EXCLUDED.same_ua_required,
       max_failures_per_window = EXCLUDED.max_failures_per_window,
       failure_window_ms = EXCLUDED.failure_window_ms,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`, [
        tenantId, merged.tokenMaxAgeMs, merged.rotationIntervalMs, merged.graceWindowMs,
        merged.enforcementMode, merged.sameIpRequired, merged.sameUaRequired,
        merged.maxFailuresPerWindow, merged.failureWindowMs, updatedBy,
    ]);
    await (0, publish_with_dsoc_1.publish)('csrf.policy.updated', tenantId, {
        policyId: tenantId,
        updatedBy,
        enforcementMode: merged.enforcementMode,
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return merged;
}
/** Return defaults for tenants without custom policy. */
function getCsrfPolicyDefaults() {
    return { ...DEFAULT_CSRF_POLICY };
}
//# sourceMappingURL=csrf-policy.service.js.map