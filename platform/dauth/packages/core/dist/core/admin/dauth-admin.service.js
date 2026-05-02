"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDauthSlaConfig = getDauthSlaConfig;
exports.updateDauthSlaConfig = updateDauthSlaConfig;
exports.getDauthEscalationPolicy = getDauthEscalationPolicy;
exports.getDauthRunbookLinks = getDauthRunbookLinks;
exports.getDauthAdminOverview = getDauthAdminOverview;
const db_1 = require("@dos/db");
const DEFAULT_SLA = {
    maxLoginLatencyMs: 2000,
    sessionTimeoutMinutes: 480,
    mfaChallengeTimeoutSeconds: 300,
    delegationMaxDurationHours: 720,
    accessReviewSlaHours: 168,
    passwordResetSlaMinutes: 15,
    invitationExpiryHours: 72,
};
const DEFAULT_ESCALATION = {
    lockedAccountEscalation: 'tenant_admin',
    sodViolationEscalation: 'security_officer',
    accessReviewOverdueEscalation: 'compliance_manager',
    bruteForceEscalation: 'security_officer',
};
const DEFAULT_RUNBOOKS = {
    accountUnlock: '/docs/runbooks/dauth/account-unlock.md',
    passwordReset: '/docs/runbooks/dauth/password-reset.md',
    mfaRecovery: '/docs/runbooks/dauth/mfa-recovery.md',
    delegationManagement: '/docs/runbooks/dauth/delegation-management.md',
    sodResolution: '/docs/runbooks/dauth/sod-resolution.md',
    accessReviewProcess: '/docs/runbooks/dauth/access-review-process.md',
    sessionManagement: '/docs/runbooks/dauth/session-management.md',
    roleAssignmentGuide: '/docs/runbooks/dauth/role-assignment-guide.md',
};
async function getDauthSlaConfig(tenantId) {
    try {
        const schema = (0, db_1.tenantSchema)(tenantId);
        const { rows } = await (0, db_1.safeQuery)(`SELECT config_value FROM "${schema}".tenant_config WHERE config_key = 'dauth_sla'`);
        if (rows[0]?.config_value) {
            return { ...DEFAULT_SLA, ...JSON.parse(rows[0].config_value) };
        }
    }
    catch { /* use defaults */ }
    return DEFAULT_SLA;
}
async function updateDauthSlaConfig(tenantId, updates) {
    const current = await getDauthSlaConfig(tenantId);
    const merged = { ...current, ...updates };
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".tenant_config (config_key, config_value, updated_at)
     VALUES ('dauth_sla', $1, NOW())
     ON CONFLICT (config_key) DO UPDATE SET config_value = $1, updated_at = NOW()`, [JSON.stringify(merged)]);
    return merged;
}
function getDauthEscalationPolicy() {
    return DEFAULT_ESCALATION;
}
function getDauthRunbookLinks() {
    return DEFAULT_RUNBOOKS;
}
async function getDauthAdminOverview(tenantId) {
    const sla = await getDauthSlaConfig(tenantId);
    const escalation = getDauthEscalationPolicy();
    const runbooks = getDauthRunbookLinks();
    const schema = (0, db_1.tenantSchema)(tenantId);
    const [totalUsers, activeUsers, lockedUsers, mfaEnabled, delegations, sodRules] = await Promise.all([
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM users WHERE tenant_id = $1`, [tenantId])
            .then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch(() => 0),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM users WHERE tenant_id = $1 AND status = 'active'`, [tenantId])
            .then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch(() => 0),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM users WHERE tenant_id = $1 AND status = 'locked'`, [tenantId])
            .then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch(() => 0),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM user_mfa WHERE is_enabled = TRUE`)
            .then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch(() => 0),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".delegations WHERE is_active = TRUE`)
            .then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch(() => 0),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".sod_rules WHERE is_active = TRUE`)
            .then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch(() => 0),
    ]);
    return {
        sla,
        escalation,
        runbooks,
        stats: {
            totalUsers,
            activeUsers,
            lockedUsers,
            mfaEnabledUsers: mfaEnabled,
            activeDelegations: delegations,
            activeSodRules: sodRules,
        },
    };
}
//# sourceMappingURL=dauth-admin.service.js.map