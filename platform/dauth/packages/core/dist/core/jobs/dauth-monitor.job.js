"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredDelegations = cleanupExpiredDelegations;
exports.cleanupExpiredSessions = cleanupExpiredSessions;
exports.expireStaleInvitations = expireStaleInvitations;
exports.runSodPeriodicScan = runSodPeriodicScan;
exports.expireStaleRoleAssignments = expireStaleRoleAssignments;
exports.getDauthJobs = getDauthJobs;
const observability_1 = require("@dos/platform-core/observability");
const errors_1 = require("@dos/types/errors");
const resilience_1 = require("@dos/platform-core/resilience");
const db_1 = require("@dos/db");
const events_1 = require("@dos/platform-core/events");
const tenancy_1 = require("@dos/platform-core/tenancy");
const dauth_config_1 = require("../dauth.config");
const sod_conflict_audit_service_1 = require("../sod/sod-conflict-audit.service");
const _DEFAULT_DELEGATION_GRACE_HOURS = dauth_config_1.DAUTH_CONFIG.delegationGraceHours;
const DEFAULT_SESSION_MAX_IDLE_HOURS = dauth_config_1.DAUTH_CONFIG.sessionMaxIdleHours;
const DEFAULT_INVITATION_EXPIRY_HOURS = dauth_config_1.DAUTH_CONFIG.invitationExpiryHours;
const DEFAULT_SOD_SCAN_LIMIT = dauth_config_1.DAUTH_CONFIG.sodScanLimit;
async function cleanupExpiredDelegations(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".delegations
     SET is_active = FALSE, updated_at = NOW()
     WHERE is_active = TRUE AND valid_to < NOW()
     RETURNING id`).catch(() => ({ rows: [] }));
    const deactivated = result.rows.length;
    if (deactivated > 0) {
        observability_1.logger.info('[Job] dauth-delegation-cleanup completed', { tenantId, deactivated });
        for (const row of result.rows) {
            await (0, events_1.publish)('dauth.delegation.expired', tenantId, { delegationId: row.id }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
        }
    }
    return { deactivated };
}
async function cleanupExpiredSessions(tenantId) {
    const result = await (0, db_1.safeQuery)(`UPDATE sessions SET status = 'expired', updated_at = NOW()
     WHERE tenant_id = $1 AND status = 'active'
       AND last_activity_at < NOW() - INTERVAL '${DEFAULT_SESSION_MAX_IDLE_HOURS} hours'
     RETURNING session_id`, [tenantId]).catch(() => ({ rows: [] }));
    const terminated = result.rows.length;
    if (terminated > 0) {
        observability_1.logger.info('[Job] dauth-session-cleanup completed', { tenantId, terminated });
    }
    return { terminated };
}
async function expireStaleInvitations(tenantId) {
    const result = await (0, db_1.safeQuery)(`UPDATE invitations SET status = 'expired', updated_at = NOW()
     WHERE tenant_id = $1 AND status = 'pending'
       AND created_at < NOW() - INTERVAL '${DEFAULT_INVITATION_EXPIRY_HOURS} hours'
     RETURNING invitation_id`, [tenantId]).catch(() => ({ rows: [] }));
    const expired = result.rows.length;
    if (expired > 0) {
        observability_1.logger.info('[Job] dauth-invitation-expiry completed', { tenantId, expired });
    }
    return { expired };
}
async function runSodPeriodicScan(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows: activeUsers } = await (0, db_1.safeQuery)(`SELECT DISTINCT user_id FROM "${schema}".enterprise_user_role_assignments
     WHERE is_active = TRUE LIMIT $1`, [DEFAULT_SOD_SCAN_LIMIT]).catch(() => ({ rows: [] }));
    let conflicts = 0;
    for (const u of activeUsers) {
        try {
            const result = await (0, sod_conflict_audit_service_1.detectConflictsForUser)(tenantId, u.user_id);
            conflicts += result?.length ?? 0;
        }
        catch { /* skip user */ }
    }
    if (conflicts > 0) {
        observability_1.logger.warn('[Job] dauth-sod-scan: conflicts detected', { tenantId, conflicts });
    }
    return { conflicts };
}
async function expireStaleRoleAssignments(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".enterprise_user_role_assignments
     SET is_active = FALSE, updated_at = NOW()
     WHERE is_active = TRUE AND valid_to IS NOT NULL AND valid_to < NOW()
     RETURNING id`).catch(() => ({ rows: [] }));
    const expired = result.rows.length;
    if (expired > 0) {
        observability_1.logger.info('[Job] dauth-role-assignment-expiry completed', { tenantId, expired });
    }
    return { expired };
}
async function getDauthJobs() {
    return [
        {
            name: 'dauth-delegation-cleanup',
            cron: '0 */2 * * *',
            description: 'Deactivate expired delegations and emit expiry events',
            handler: async () => {
                observability_1.logger.info('[Job] dauth-delegation-cleanup executed');
                try {
                    const tenants = await (0, tenancy_1.getProvisionedTenants)();
                    for (const t of tenants) {
                        try {
                            await cleanupExpiredDelegations(t.tenant_id);
                        }
                        catch { /* skip */ }
                    }
                }
                catch (err) {
                    observability_1.logger.error('[Job] dauth-delegation-cleanup error:', (0, errors_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'dauth-session-cleanup',
            cron: '0 * * * *',
            description: 'Terminate idle sessions beyond max idle threshold',
            handler: async () => {
                observability_1.logger.info('[Job] dauth-session-cleanup executed');
                try {
                    const tenants = await (0, tenancy_1.getProvisionedTenants)();
                    for (const t of tenants) {
                        try {
                            await cleanupExpiredSessions(t.tenant_id);
                        }
                        catch { /* skip */ }
                    }
                }
                catch (err) {
                    observability_1.logger.error('[Job] dauth-session-cleanup error:', (0, errors_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'dauth-invitation-expiry',
            cron: '0 4 * * *',
            description: 'Mark stale pending invitations as expired',
            handler: async () => {
                observability_1.logger.info('[Job] dauth-invitation-expiry executed');
                try {
                    const tenants = await (0, tenancy_1.getProvisionedTenants)();
                    for (const t of tenants) {
                        try {
                            await expireStaleInvitations(t.tenant_id);
                        }
                        catch { /* skip */ }
                    }
                }
                catch (err) {
                    observability_1.logger.error('[Job] dauth-invitation-expiry error:', (0, errors_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'dauth-sod-periodic-scan',
            cron: '0 3 * * *',
            description: 'Scan all active role assignments for SoD conflicts',
            handler: async () => {
                observability_1.logger.info('[Job] dauth-sod-periodic-scan executed');
                try {
                    const tenants = await (0, tenancy_1.getProvisionedTenants)();
                    for (const t of tenants) {
                        try {
                            await runSodPeriodicScan(t.tenant_id);
                        }
                        catch { /* skip */ }
                    }
                }
                catch (err) {
                    observability_1.logger.error('[Job] dauth-sod-periodic-scan error:', (0, errors_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'dauth-role-assignment-expiry',
            cron: '0 */4 * * *',
            description: 'Deactivate role assignments past their valid_to date',
            handler: async () => {
                observability_1.logger.info('[Job] dauth-role-assignment-expiry executed');
                try {
                    const tenants = await (0, tenancy_1.getProvisionedTenants)();
                    for (const t of tenants) {
                        try {
                            await expireStaleRoleAssignments(t.tenant_id);
                        }
                        catch { /* skip */ }
                    }
                }
                catch (err) {
                    observability_1.logger.error('[Job] dauth-role-assignment-expiry error:', (0, errors_1.toErrorMessage)(err));
                }
            },
        },
    ];
}
//# sourceMappingURL=dauth-monitor.job.js.map