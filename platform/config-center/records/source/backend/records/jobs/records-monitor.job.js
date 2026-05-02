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
exports.getRecordsJobs = getRecordsJobs;
const module_sdk_1 = require("@dos/module-sdk");
const records_constants_1 = require("../data/records-constants");
async function getRecordsJobs() {
    const { getProvisionedTenants } = await Promise.resolve().then(() => __importStar(require('@dos/platform-core/jobs')));
    return [
        {
            name: 'records-retention-monitor',
            // @ts-ignore - cron property mismatch
            cron: '0 1 * * *',
            description: `Flag records approaching retention expiry within ${records_constants_1.RECORDS_BUSINESS_THRESHOLDS.RETENTION_WARNING_DAYS} days`,
            handler: async () => {
                module_sdk_1.logger.info('[Job] records-retention-monitor started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".records_records
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('disposed', 'archived')
                   AND disposal_date IS NOT NULL
                   AND disposal_date BETWEEN NOW() AND NOW() + INTERVAL '${records_constants_1.RECORDS_BUSINESS_THRESHOLDS.RETENTION_WARNING_DAYS} days'`);
                            const count = result.rows[0]?.count || 0;
                            if (count > 0) {
                                module_sdk_1.logger.warn(`[Job] records-retention-monitor: tenant ${t.tenant_id} — ${count} records approaching retention expiry`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] records-retention-monitor error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'records-overdue-disposal',
            // @ts-ignore - cron property mismatch
            cron: '0 2 * * *',
            description: 'Detect records past disposal date that have not been disposed',
            handler: async () => {
                module_sdk_1.logger.info('[Job] records-overdue-disposal started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT id, title, record_type, classification,
                   EXTRACT(DAY FROM NOW() - disposal_date)::int AS days_overdue
                 FROM "${schema}".records_records
                 WHERE deleted_at IS NULL
                   AND status NOT IN ('disposed', 'archived')
                   AND disposal_date IS NOT NULL AND disposal_date < NOW()
                   AND legal_hold = false
                 ORDER BY disposal_date ASC LIMIT 100`);
                            if (result.rows.length > 0) {
                                module_sdk_1.logger.warn(`[Job] records-overdue-disposal: tenant ${t.tenant_id} — ${result.rows.length} records overdue for disposal`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] records-overdue-disposal error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'records-legal-hold-review',
            // @ts-ignore - cron property mismatch
            cron: '0 9 * * 1',
            description: `Review legal holds older than ${records_constants_1.RECORDS_BUSINESS_THRESHOLDS.LEGAL_HOLD_REVIEW_DAYS} days`,
            handler: async () => {
                module_sdk_1.logger.info('[Job] records-legal-hold-review started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT id, title, record_type, classification,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_on_hold
                 FROM "${schema}".records_records
                 WHERE deleted_at IS NULL AND legal_hold = true
                   AND updated_at < NOW() - INTERVAL '${records_constants_1.RECORDS_BUSINESS_THRESHOLDS.LEGAL_HOLD_REVIEW_DAYS} days'`);
                            if (result.rows.length > 0) {
                                module_sdk_1.logger.warn(`[Job] records-legal-hold-review: tenant ${t.tenant_id} — ${result.rows.length} records on legal hold for ${records_constants_1.RECORDS_BUSINESS_THRESHOLDS.LEGAL_HOLD_REVIEW_DAYS}+ days need review`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] records-legal-hold-review error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'records-classification-audit',
            // @ts-ignore - cron property mismatch
            cron: '0 6 1 * *',
            description: 'Audit records with missing or invalid classification',
            handler: async () => {
                module_sdk_1.logger.info('[Job] records-classification-audit started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".records_records
                 WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')
                   AND (classification IS NULL OR classification = '')`);
                            const count = result.rows[0]?.count || 0;
                            if (count > 0) {
                                module_sdk_1.logger.warn(`[Job] records-classification-audit: tenant ${t.tenant_id} — ${count} records missing classification`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] records-classification-audit error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'records-no-retention-policy',
            // @ts-ignore - cron property mismatch
            cron: '0 7 * * 1',
            description: 'Flag active records without a retention policy',
            handler: async () => {
                module_sdk_1.logger.info('[Job] records-no-retention-policy started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".records_records
                 WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')
                   AND retention_period IS NULL`);
                            const count = result.rows[0]?.count || 0;
                            if (count > 0) {
                                module_sdk_1.logger.warn(`[Job] records-no-retention-policy: tenant ${t.tenant_id} — ${count} active records without retention policy`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] records-no-retention-policy error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'records-stale-review',
            // @ts-ignore - cron property mismatch
            cron: '0 8 * * *',
            description: `Detect records stuck in review for ${records_constants_1.RECORDS_TIMEOUTS.REVIEW_TIMEOUT_DAYS}+ days`,
            handler: async () => {
                module_sdk_1.logger.info('[Job] records-stale-review started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`SELECT id, title, record_type,
                   EXTRACT(DAY FROM NOW() - updated_at)::int AS days_in_review
                 FROM "${schema}".records_records
                 WHERE deleted_at IS NULL AND status = 'review'
                   AND updated_at < NOW() - INTERVAL '${records_constants_1.RECORDS_TIMEOUTS.REVIEW_TIMEOUT_DAYS} days'`);
                            if (result.rows.length > 0) {
                                module_sdk_1.logger.warn(`[Job] records-stale-review: tenant ${t.tenant_id} — ${result.rows.length} records stuck in review`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] records-stale-review error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'records-auto-archive',
            // @ts-ignore - cron property mismatch
            cron: '0 3 * * 0',
            description: `Auto-archive disposed records after ${records_constants_1.RECORDS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days`,
            handler: async () => {
                module_sdk_1.logger.info('[Job] records-auto-archive started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            const result = await safeQuery(`UPDATE "${schema}".records_records
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status IN ('disposed')
                   AND updated_at < NOW() - INTERVAL '${records_constants_1.RECORDS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`);
                            if (result.rowCount && result.rowCount > 0) {
                                module_sdk_1.logger.info(`[Job] records-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} disposed records archived`);
                            }
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] records-auto-archive error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
        {
            name: 'records-data-retention',
            // @ts-ignore - cron property mismatch
            cron: '0 0 1 * *',
            description: 'Enforce data retention — soft-delete archived records past retention, respecting legal holds',
            handler: async () => {
                module_sdk_1.logger.info('[Job] records-data-retention started');
                try {
                    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
                    const tenants = await getProvisionedTenants();
                    for (const t of tenants) {
                        try {
                            const schema = tenantSchema(t.tenant_id);
                            await safeQuery(`UPDATE "${schema}".records_records
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND legal_hold = false
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'records' AND lh.active = true
                   )`);
                        }
                        catch { }
                    }
                }
                catch (err) {
                    module_sdk_1.logger.error('[Job] records-data-retention error:', (0, module_sdk_1.toErrorMessage)(err));
                }
            },
        },
    ];
}
//# sourceMappingURL=records-monitor.job.js.map