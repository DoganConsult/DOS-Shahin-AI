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
exports.getActionSeedData = getActionSeedData;
exports.seedActionModule = seedActionModule;
const action_constants_1 = require("./action-constants");
const resilience_1 = require("@dos/platform-core/resilience");
/**
 * Design-token color references for seed data.
 * Maps semantic meaning to CSS custom property names from grc-tokens.css.
 * At seed time these are stored as token references; the frontend resolves them at render.
 */
const SEED_COLORS = {
    critical: 'var(--severity-critical)',
    high: 'var(--severity-high)',
    medium: 'var(--severity-medium)',
    low: 'var(--severity-low)',
};
function getActionSeedData() {
    return {
        defaultConfigs: {
            moduleCode: 'action',
            autoArchiveEnabled: true,
            autoArchiveAfterDays: action_constants_1.ACTION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
            defaultVisibility: 'org',
            notificationsEnabled: true,
            aiAssistEnabled: true,
            workflowEnabled: true,
            maxItemsPerPage: 50,
            maxSubtasks: action_constants_1.ACTION_LIMITS.MAX_SUBTASKS,
            maxAssignees: action_constants_1.ACTION_LIMITS.MAX_ASSIGNEES,
            maxWatchers: action_constants_1.ACTION_LIMITS.MAX_WATCHERS,
            overdueEscalationHours: action_constants_1.ACTION_BUSINESS_THRESHOLDS.OVERDUE_ESCALATION_HOURS,
            staleAfterDays: action_constants_1.ACTION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS,
            maxExportRows: action_constants_1.ACTION_LIMITS.MAX_EXPORT_ROWS,
        },
        actionTypes: [
            { code: 'task', labelEn: 'Task', labelAr: 'مهمة', defaultPriority: 'medium' },
            { code: 'corrective', labelEn: 'Corrective Action', labelAr: 'إجراء تصحيحي', defaultPriority: 'high' },
            { code: 'preventive', labelEn: 'Preventive Action', labelAr: 'إجراء وقائي', defaultPriority: 'medium' },
            { code: 'improvement', labelEn: 'Improvement Action', labelAr: 'إجراء تحسيني', defaultPriority: 'low' },
            { code: 'follow_up', labelEn: 'Follow-Up', labelAr: 'متابعة', defaultPriority: 'medium' },
            { code: 'mitigation', labelEn: 'Risk Mitigation', labelAr: 'تخفيف المخاطر', defaultPriority: 'high' },
            { code: 'compliance', labelEn: 'Compliance Action', labelAr: 'إجراء امتثال', defaultPriority: 'high' },
        ],
        sourceTypes: [
            { code: 'manual', labelEn: 'Manual Entry', labelAr: 'إدخال يدوي', moduleLink: null },
            { code: 'audit_finding', labelEn: 'Audit Finding', labelAr: 'نتيجة تدقيق', moduleLink: 'audit' },
            { code: 'risk', labelEn: 'Risk Assessment', labelAr: 'تقييم مخاطر', moduleLink: 'risk' },
            { code: 'incident', labelEn: 'Incident', labelAr: 'حادث', moduleLink: 'incident' },
            { code: 'compliance_gap', labelEn: 'Compliance Gap', labelAr: 'فجوة امتثال', moduleLink: 'compliance' },
            { code: 'vulnerability', labelEn: 'Vulnerability', labelAr: 'ثغرة أمنية', moduleLink: 'risk' },
            { code: 'workflow', labelEn: 'Workflow', labelAr: 'سير عمل', moduleLink: 'workflow' },
        ],
        priorities: [
            { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', slaHours: 4, color: SEED_COLORS.critical },
            { code: 'high', labelEn: 'High', labelAr: 'مرتفع', slaHours: 24, color: SEED_COLORS.high },
            { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', slaHours: 72, color: SEED_COLORS.medium },
            { code: 'low', labelEn: 'Low', labelAr: 'منخفض', slaHours: 168, color: SEED_COLORS.low },
        ],
        actionStatuses: [
            { code: 'open', labelEn: 'Open', labelAr: 'مفتوح', terminal: false },
            { code: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ', terminal: false },
            { code: 'pending_review', labelEn: 'Pending Review', labelAr: 'في انتظار المراجعة', terminal: false },
            { code: 'completed', labelEn: 'Completed', labelAr: 'مكتمل', terminal: true },
            { code: 'overdue', labelEn: 'Overdue', labelAr: 'متأخر', terminal: false },
            { code: 'cancelled', labelEn: 'Cancelled', labelAr: 'ملغي', terminal: true },
            { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
        ],
        recurrenceTypes: [
            { code: 'none', labelEn: 'No Recurrence', labelAr: 'بدون تكرار' },
            { code: 'daily', labelEn: 'Daily', labelAr: 'يومي' },
            { code: 'weekly', labelEn: 'Weekly', labelAr: 'أسبوعي' },
            { code: 'monthly', labelEn: 'Monthly', labelAr: 'شهري' },
            { code: 'quarterly', labelEn: 'Quarterly', labelAr: 'ربع سنوي' },
            { code: 'annually', labelEn: 'Annually', labelAr: 'سنوي' },
        ],
    };
}
async function seedActionModule(tenantId, schema) {
    const data = getActionSeedData();
    const { safeQuery } = await Promise.resolve().then(() => __importStar(require('@dos/db')));
    for (const [key, value] of Object.entries(data.defaultConfigs)) {
        await safeQuery(`INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`, ['action', key, JSON.stringify(value), tenantId]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
}
//# sourceMappingURL=action-seed.js.map