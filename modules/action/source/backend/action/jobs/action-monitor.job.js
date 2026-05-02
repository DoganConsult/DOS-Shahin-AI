"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActionJobs = getActionJobs;
const module_sdk_1 = require("@dos/module-sdk");
const action_constants_1 = require("../data/action-constants");
async function getActionJobs() {
    const { getProvisionedTenants } = await Promise.resolve().then(() => __importStar(require('@dos/platform-core/tenancy')));
    return [
        {
            name: 'action-overdue-monitor',
            // @ts-ignore - cron property mismatch
            cron: '0 */4 * * *',
            description: 'Detect overdue action items and flag for escalation',
            handler: async () => {
                module_sdk_1.logger.info('[Job] action-overdue-monitor started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('@dos/db')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT
                   COUNT(*) FILTER (WHERE priority = 'critical')::int AS critical_overdue,
                   COUNT(*) FILTER (WHERE priority = 'high')::int AS high_overdue,
                   COUNT(*) FILTER (WHERE priority IN ('medium', 'low'))::int AS other_overdue
                 FROM "${schema}".action_action_items
                 WHERE deleted_at IS NULL
                   AND due_date < NOW()
                   AND status NOT IN ('completed', 'cancelled', 'archived')`);
                            const r = result.rows[0] || {};
                            if ((r.critical_overdue || 0) > 0) {
                                module_sdk_1.logger.error(`[Job] action-overdue-monitor: tenant ${t.tenant_id} — ${r.critical_overdue} CRITICAL actions overdue!`);
                            }
                            if ((r.high_overdue || 0) > 0) {
                                module_sdk_1.logger.warn(`[Job] action-overdue-monitor: tenant ${t.tenant_id} — ${r.high_overdue} high-priority actions overdue`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] action-overdue-monitor error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'action-due-soon-warning',
            // @ts-ignore - cron property mismatch
            cron: '0 8 * * *',
            description: `Warn about actions due within ${action_constants_1.ACTION_BUSINESS_THRESHOLDS.OVERDUE_ESCALATION_HOURS}h`,
            handler: async () => {
                module_sdk_1.logger.info('[Job] action-due-soon-warning started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('@dos/db')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT COUNT(*)::int AS count
                 FROM "${schema}".action_action_items
                 WHERE deleted_at IS NULL
                   AND due_date BETWEEN NOW() AND NOW() + INTERVAL '${action_constants_1.ACTION_BUSINESS_THRESHOLDS.OVERDUE_ESCALATION_HOURS} hours'
                   AND status NOT IN ('completed', 'cancelled', 'archived')`);
                            const count = result.rows[0]?.count || 0;
                            if (count > 0) {
                                module_sdk_1.logger.warn(`[Job] action-due-soon-warning: tenant ${t.tenant_id} — ${count} actions due within ${action_constants_1.ACTION_BUSINESS_THRESHOLDS.OVERDUE_ESCALATION_HOURS}h`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] action-due-soon-warning error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'action-auto-overdue',
            // @ts-ignore - cron property mismatch
            cron: '0 0 * * *',
            description: 'Auto-mark past-due actions as overdue status',
            handler: async () => {
                module_sdk_1.logger.info('[Job] action-auto-overdue started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('@dos/db')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`UPDATE "${schema}".action_action_items
                 SET status = 'overdue', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND due_date < NOW()
                   AND status IN ('open', 'in_progress')`);
                            if (result.rowCount && result.rowCount > 0) {
                                module_sdk_1.logger.warn(`[Job] action-auto-overdue: tenant ${t.tenant_id} — ${result.rowCount} actions marked overdue`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] action-auto-overdue error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'action-stale-detector',
            // @ts-ignore - cron property mismatch
            cron: '0 9 * * 1',
            description: `Detect stale actions not updated in ${action_constants_1.ACTION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
            handler: async () => {
                module_sdk_1.logger.info('[Job] action-stale-detector started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('@dos/db')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT id, title, priority, assigned_to,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_stale
                 FROM "${schema}".action_action_items
                 WHERE deleted_at IS NULL AND status IN ('open', 'in_progress')
                   AND updated_at < NOW() - INTERVAL '${action_constants_1.ACTION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`);
                            if (result.rows.length > 0) {
                                module_sdk_1.logger.warn(`[Job] action-stale-detector: tenant ${t.tenant_id} — ${result.rows.length} stale actions`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] action-stale-detector error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'action-workload-report',
            // @ts-ignore - cron property mismatch
            cron: '0 7 * * 1',
            description: 'Weekly workload report per assignee',
            handler: async () => {
                module_sdk_1.logger.info('[Job] action-workload-report started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('@dos/db')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT assigned_to,
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS overdue
                 FROM "${schema}".action_action_items
                 WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled', 'archived')
                   AND assigned_to IS NOT NULL
                 GROUP BY assigned_to ORDER BY overdue DESC LIMIT 20`);
                            for (const row of result.rows) {
                                if ((row.overdue || 0) > 0) {
                                    module_sdk_1.logger.warn(`[Job] action-workload-report: tenant ${t.tenant_id} — ${row.assigned_to}: ${row.total} total, ${row.overdue} overdue`);
                                }
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] action-workload-report error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'action-unassigned-check',
            // @ts-ignore - cron property mismatch
            cron: '0 10 * * *',
            description: 'Flag open actions without assignees',
            handler: async () => {
                module_sdk_1.logger.info('[Job] action-unassigned-check started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('@dos/db')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT COUNT(*)::int AS count
                 FROM "${schema}".action_action_items
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('completed', 'cancelled', 'archived')
                   AND (assigned_to IS NULL OR assigned_to = '')`);
                            const count = result.rows[0]?.count || 0;
                            if (count > 0) {
                                module_sdk_1.logger.warn(`[Job] action-unassigned-check: tenant ${t.tenant_id} — ${count} open actions without assignee`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] action-unassigned-check error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'action-auto-archive',
            // @ts-ignore - cron property mismatch
            cron: '0 3 * * 0',
            description: `Auto-archive completed/cancelled actions after ${action_constants_1.ACTION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
            handler: async () => {
                module_sdk_1.logger.info('[Job] action-auto-archive started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('@dos/db')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`UPDATE "${schema}".action_action_items
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status IN ('completed', 'cancelled')
                   AND updated_at < NOW() - INTERVAL '${action_constants_1.ACTION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`);
                            if (result.rowCount && result.rowCount > 0) {
                                module_sdk_1.logger.info(`[Job] action-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} actions archived`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] action-auto-archive error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'action-data-retention',
            // @ts-ignore - cron property mismatch
            cron: '0 0 1 * *',
            description: 'Enforce data retention — soft-delete archived actions past retention, respecting legal holds',
            handler: async () => {
                module_sdk_1.logger.info('[Job] action-data-retention started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('@dos/db')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            await safeQuery(`UPDATE "${schema}".action_action_items
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'action' AND lh.active = true
                   )`);
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] action-data-retention error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
    ];
}
//# sourceMappingURL=action-monitor.job.js.map