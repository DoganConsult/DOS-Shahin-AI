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
exports.getRecordsSeedData = getRecordsSeedData;
exports.seedRecordsModule = seedRecordsModule;
const records_constants_1 = require("./records-constants");
const resilience_1 = require("@dos/platform-core/resilience");
function getRecordsSeedData() {
    return {
        defaultConfigs: {
            moduleCode: 'records',
            autoArchiveEnabled: true,
            autoArchiveAfterDays: records_constants_1.RECORDS_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
            defaultVisibility: 'org',
            notificationsEnabled: true,
            aiAssistEnabled: true,
            workflowEnabled: true,
            maxItemsPerPage: 50,
            retentionWarningDays: records_constants_1.RECORDS_BUSINESS_THRESHOLDS.RETENTION_WARNING_DAYS,
            disposalGraceDays: records_constants_1.RECORDS_TIMEOUTS.DISPOSAL_GRACE_DAYS,
            reviewTimeoutDays: records_constants_1.RECORDS_TIMEOUTS.REVIEW_TIMEOUT_DAYS,
            legalHoldReviewDays: records_constants_1.RECORDS_BUSINESS_THRESHOLDS.LEGAL_HOLD_REVIEW_DAYS,
            maxExportRows: records_constants_1.RECORDS_LIMITS.MAX_EXPORT_ROWS,
        },
        retentionPolicies: [
            { code: 'ret_policy_docs', nameEn: 'Policy Documents', nameAr: 'وثائق السياسات', recordType: 'policy', classification: 'confidential', retentionDays: 2555, legalBasis: 'NCA-ECC Compliance' },
            { code: 'ret_evidence', nameEn: 'Audit Evidence', nameAr: 'أدلة التدقيق', recordType: 'evidence', classification: 'restricted', retentionDays: 1825, legalBasis: 'ISO 27001' },
            { code: 'ret_audit_reports', nameEn: 'Audit Reports', nameAr: 'تقارير التدقيق', recordType: 'audit_report', classification: 'confidential', retentionDays: 2555, legalBasis: 'Regulatory Requirement' },
            { code: 'ret_contracts', nameEn: 'Contracts', nameAr: 'العقود', recordType: 'contract', classification: 'restricted', retentionDays: 3650, legalBasis: 'Commercial Law' },
            { code: 'ret_procedures', nameEn: 'Procedures', nameAr: 'الإجراءات', recordType: 'procedure', classification: 'internal', retentionDays: 1095, legalBasis: 'Operational' },
            { code: 'ret_training', nameEn: 'Training Records', nameAr: 'سجلات التدريب', recordType: 'training', classification: 'internal', retentionDays: 730, legalBasis: 'HR Policy' },
            { code: 'ret_incidents', nameEn: 'Incident Records', nameAr: 'سجلات الحوادث', recordType: 'incident', classification: 'confidential', retentionDays: 2555, legalBasis: 'NCA-ECC Incident Mgmt' },
        ],
        recordTypes: [
            { code: 'policy', labelEn: 'Policy Document', labelAr: 'وثيقة سياسة' },
            { code: 'evidence', labelEn: 'Evidence', labelAr: 'دليل' },
            { code: 'audit_report', labelEn: 'Audit Report', labelAr: 'تقرير تدقيق' },
            { code: 'contract', labelEn: 'Contract', labelAr: 'عقد' },
            { code: 'procedure', labelEn: 'Procedure', labelAr: 'إجراء' },
            { code: 'training', labelEn: 'Training Record', labelAr: 'سجل تدريب' },
            { code: 'incident', labelEn: 'Incident Record', labelAr: 'سجل حادث' },
            { code: 'other', labelEn: 'Other', labelAr: 'أخرى' },
        ],
        classifications: [
            { code: 'public', labelEn: 'Public', labelAr: 'عام', retentionMultiplier: 1 },
            { code: 'internal', labelEn: 'Internal', labelAr: 'داخلي', retentionMultiplier: 1.5 },
            { code: 'confidential', labelEn: 'Confidential', labelAr: 'سري', retentionMultiplier: 2 },
            { code: 'restricted', labelEn: 'Restricted', labelAr: 'مقيد', retentionMultiplier: 3 },
            { code: 'top_secret', labelEn: 'Top Secret', labelAr: 'سري للغاية', retentionMultiplier: 5 },
        ],
        disposalMethods: [
            { code: 'secure_delete', labelEn: 'Secure Delete', labelAr: 'حذف آمن' },
            { code: 'shred', labelEn: 'Physical Shredding', labelAr: 'تمزيق مادي' },
            { code: 'anonymize', labelEn: 'Anonymization', labelAr: 'إخفاء الهوية' },
            { code: 'transfer', labelEn: 'Transfer to Archive', labelAr: 'نقل إلى الأرشيف' },
        ],
        recordStatuses: [
            { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false },
            { code: 'retention', labelEn: 'In Retention', labelAr: 'في فترة الاحتفاظ', terminal: false },
            { code: 'review', labelEn: 'Under Review', labelAr: 'قيد المراجعة', terminal: false },
            { code: 'hold', labelEn: 'Legal Hold', labelAr: 'حجز قانوني', terminal: false },
            { code: 'disposal_pending', labelEn: 'Disposal Pending', labelAr: 'في انتظار الإتلاف', terminal: false },
            { code: 'disposed', labelEn: 'Disposed', labelAr: 'تم الإتلاف', terminal: true },
            { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
        ],
    };
}
async function seedRecordsModule(tenantId, schema) {
    const data = getRecordsSeedData();
    const { safeQuery } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
    for (const [key, value] of Object.entries(data.defaultConfigs)) {
        await safeQuery(`INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`, ['records', key, JSON.stringify(value), tenantId]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    for (const pol of data.retentionPolicies) {
        await safeQuery(`INSERT INTO "${schema}".record_retention_policies (name, record_type, classification, retention_days, legal_basis, is_active, tenant_id)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       ON CONFLICT DO NOTHING`, [pol.nameEn, pol.recordType, pol.classification, pol.retentionDays, pol.legalBasis, tenantId]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
}
//# sourceMappingURL=records-seed.js.map