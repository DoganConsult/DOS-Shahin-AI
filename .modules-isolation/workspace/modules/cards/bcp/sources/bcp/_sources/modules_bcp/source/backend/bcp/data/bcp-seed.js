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
exports.getBcpSeedData = getBcpSeedData;
exports.seedBcpModule = seedBcpModule;
const bcp_constants_1 = require("./bcp-constants");
const resilient_catch_1 = require("@dos/platform-core/resilience");
function getBcpSeedData() {
    return {
        defaultConfigs: {
            moduleCode: 'bcp',
            autoArchiveEnabled: true,
            autoArchiveAfterDays: bcp_constants_1.BCP_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
            defaultVisibility: 'org',
            notificationsEnabled: true,
            aiAssistEnabled: true,
            workflowEnabled: true,
            maxItemsPerPage: 50,
            defaultRtoHours: bcp_constants_1.BCP_DEFAULT_RTO_HOURS,
            defaultRpoHours: bcp_constants_1.BCP_DEFAULT_RPO_HOURS,
            testFrequencyDays: bcp_constants_1.BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS,
            testReminderBeforeDays: bcp_constants_1.BCP_TIMEOUTS.TEST_REMINDER_BEFORE_DAYS,
            maxTeamMembers: bcp_constants_1.BCP_LIMITS.MAX_TEAM_MEMBERS,
            maxRecoverySteps: bcp_constants_1.BCP_LIMITS.MAX_RECOVERY_STEPS,
            maxCriticalSystems: bcp_constants_1.BCP_LIMITS.MAX_CRITICAL_SYSTEMS,
            maxExportRows: bcp_constants_1.BCP_LIMITS.MAX_EXPORT_ROWS,
        },
        planTypes: [
            { code: 'bcp', labelEn: 'Business Continuity Plan', labelAr: 'خطة استمرارية الأعمال' },
            { code: 'drp', labelEn: 'Disaster Recovery Plan', labelAr: 'خطة التعافي من الكوارث' },
            { code: 'crisis_management', labelEn: 'Crisis Management Plan', labelAr: 'خطة إدارة الأزمات' },
            { code: 'pandemic', labelEn: 'Pandemic Response Plan', labelAr: 'خطة الاستجابة للأوبئة' },
            { code: 'cyber_incident', labelEn: 'Cyber Incident Response', labelAr: 'خطة الاستجابة للحوادث السيبرانية' },
            { code: 'communication', labelEn: 'Crisis Communication Plan', labelAr: 'خطة اتصالات الأزمات' },
            { code: 'evacuation', labelEn: 'Evacuation Plan', labelAr: 'خطة الإخلاء' },
        ],
        testTypes: [
            { code: 'tabletop', labelEn: 'Tabletop Exercise', labelAr: 'تمرين طاولة', complexity: 'low' },
            { code: 'walkthrough', labelEn: 'Walkthrough', labelAr: 'تمرين مراجعة', complexity: 'low' },
            { code: 'simulation', labelEn: 'Simulation', labelAr: 'محاكاة', complexity: 'medium' },
            { code: 'full_scale', labelEn: 'Full-Scale Exercise', labelAr: 'تمرين كامل النطاق', complexity: 'high' },
            { code: 'parallel', labelEn: 'Parallel Test', labelAr: 'اختبار متوازي', complexity: 'high' },
            { code: 'cutover', labelEn: 'Cutover Test', labelAr: 'اختبار التحويل', complexity: 'critical' },
        ],
        impactTiers: [
            { code: 'tier1_critical', labelEn: 'Tier 1 - Critical', labelAr: 'المستوى 1 - حرج', maxRtoHours: 4 },
            { code: 'tier2_essential', labelEn: 'Tier 2 - Essential', labelAr: 'المستوى 2 - أساسي', maxRtoHours: 24 },
            { code: 'tier3_normal', labelEn: 'Tier 3 - Normal', labelAr: 'المستوى 3 - عادي', maxRtoHours: 72 },
            { code: 'tier4_deferrable', labelEn: 'Tier 4 - Deferrable', labelAr: 'المستوى 4 - قابل للتأجيل', maxRtoHours: 168 },
        ],
        activationTriggers: [
            { code: 'system_outage', labelEn: 'System Outage', labelAr: 'انقطاع النظام' },
            { code: 'natural_disaster', labelEn: 'Natural Disaster', labelAr: 'كارثة طبيعية' },
            { code: 'cyber_attack', labelEn: 'Cyber Attack', labelAr: 'هجوم سيبراني' },
            { code: 'pandemic', labelEn: 'Pandemic', labelAr: 'وباء' },
            { code: 'facility_loss', labelEn: 'Facility Loss', labelAr: 'فقدان المنشأة' },
            { code: 'key_personnel_loss', labelEn: 'Key Personnel Loss', labelAr: 'فقدان الكوادر الرئيسية' },
            { code: 'supply_chain', labelEn: 'Supply Chain Disruption', labelAr: 'اضطراب سلسلة التوريد' },
        ],
        bcpStatuses: [
            { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
            { code: 'approved', labelEn: 'Approved', labelAr: 'معتمد', terminal: false },
            { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false },
            { code: 'testing', labelEn: 'Under Testing', labelAr: 'قيد الاختبار', terminal: false },
            { code: 'failed_test', labelEn: 'Test Failed', labelAr: 'فشل الاختبار', terminal: false },
            { code: 'review', labelEn: 'Under Review', labelAr: 'قيد المراجعة', terminal: false },
            { code: 'retired', labelEn: 'Retired', labelAr: 'متقاعد', terminal: true },
            { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
        ],
    };
}
async function seedBcpModule(tenantId, schema) {
    const data = getBcpSeedData();
    const { safeQuery } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
    for (const [key, value] of Object.entries(data.defaultConfigs)) {
        await safeQuery(`INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`, ['bcp', key, JSON.stringify(value), tenantId]).catch((0, resilient_catch_1.catchHandler)(resilient_catch_1.EC.EVENT_BUS));
    }
}
//# sourceMappingURL=bcp-seed.js.map