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
exports.getAssetSeedData = getAssetSeedData;
exports.seedAssetModule = seedAssetModule;
const asset_constants_1 = require("./asset-constants");
const resilience_1 = require("@dos/platform-core/resilience");
/**
 * Design-token color references for seed data.
 * Maps semantic meaning to CSS custom property names from grc-tokens.css.
 * At seed time these are stored as token references; the frontend resolves them at render.
 */
const SEED_COLORS = {
    top_secret: 'var(--severity-critical)',
    restricted: 'var(--error)',
    confidential: 'var(--severity-high)',
    internal: 'var(--severity-medium)',
    public: 'var(--severity-low)',
};
function getAssetSeedData() {
    return {
        defaultConfigs: {
            moduleCode: 'asset',
            autoArchiveEnabled: true,
            autoArchiveAfterDays: asset_constants_1.ASSET_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
            defaultVisibility: 'org',
            notificationsEnabled: true,
            aiAssistEnabled: true,
            workflowEnabled: true,
            maxItemsPerPage: 50,
            reviewCycleDays: asset_constants_1.ASSET_TIMEOUTS.REVIEW_CYCLE_DAYS,
            maxLinkedRisks: asset_constants_1.ASSET_LIMITS.MAX_LINKED_RISKS,
            maxLinkedControls: asset_constants_1.ASSET_LIMITS.MAX_LINKED_CONTROLS,
            maxCustomAttributes: asset_constants_1.ASSET_LIMITS.MAX_CUSTOM_ATTRIBUTES,
            maxExportRows: asset_constants_1.ASSET_LIMITS.MAX_EXPORT_ROWS,
        },
        assetTypes: [
            { code: 'hardware', labelEn: 'Hardware', labelAr: 'أجهزة' },
            { code: 'software', labelEn: 'Software', labelAr: 'برمجيات' },
            { code: 'data', labelEn: 'Data', labelAr: 'بيانات' },
            { code: 'network', labelEn: 'Network', labelAr: 'شبكة' },
            { code: 'cloud', labelEn: 'Cloud', labelAr: 'سحابي' },
            { code: 'facility', labelEn: 'Facility', labelAr: 'منشأة' },
            { code: 'people', labelEn: 'People', labelAr: 'أشخاص' },
            { code: 'service', labelEn: 'Service', labelAr: 'خدمة' },
            { code: 'intellectual_property', labelEn: 'Intellectual Property', labelAr: 'ملكية فكرية' },
        ],
        classificationLevels: [
            { code: 'top_secret', labelEn: 'Top Secret', labelAr: 'سري للغاية', color: SEED_COLORS.top_secret },
            { code: 'restricted', labelEn: 'Restricted', labelAr: 'مقيد', color: SEED_COLORS.restricted },
            { code: 'confidential', labelEn: 'Confidential', labelAr: 'سري', color: SEED_COLORS.confidential },
            { code: 'internal', labelEn: 'Internal', labelAr: 'داخلي', color: SEED_COLORS.internal },
            { code: 'public', labelEn: 'Public', labelAr: 'عام', color: SEED_COLORS.public },
        ],
        criticalityLevels: [
            { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', slaHours: 4 },
            { code: 'high', labelEn: 'High', labelAr: 'مرتفع', slaHours: 24 },
            { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', slaHours: 72 },
            { code: 'low', labelEn: 'Low', labelAr: 'منخفض', slaHours: 168 },
        ],
        ownershipTypes: [
            { code: 'owned', labelEn: 'Owned', labelAr: 'مملوك' },
            { code: 'leased', labelEn: 'Leased', labelAr: 'مؤجر' },
            { code: 'shared', labelEn: 'Shared', labelAr: 'مشترك' },
            { code: 'contracted', labelEn: 'Contracted', labelAr: 'متعاقد' },
            { code: 'cloud_hosted', labelEn: 'Cloud Hosted', labelAr: 'مستضاف سحابياً' },
        ],
        environments: [
            { code: 'production', labelEn: 'Production', labelAr: 'إنتاج' },
            { code: 'staging', labelEn: 'Staging', labelAr: 'تجريب' },
            { code: 'development', labelEn: 'Development', labelAr: 'تطوير' },
            { code: 'testing', labelEn: 'Testing', labelAr: 'اختبار' },
            { code: 'dr', labelEn: 'Disaster Recovery', labelAr: 'التعافي من الكوارث' },
            { code: 'decommissioned', labelEn: 'Decommissioned', labelAr: 'خارج الخدمة' },
        ],
        assetStatuses: [
            { code: 'discovered', labelEn: 'Discovered', labelAr: 'مكتشف', terminal: false },
            { code: 'registered', labelEn: 'Registered', labelAr: 'مسجل', terminal: false },
            { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false },
            { code: 'maintenance', labelEn: 'Under Maintenance', labelAr: 'قيد الصيانة', terminal: false },
            { code: 'decommissioning', labelEn: 'Decommissioning', labelAr: 'قيد إيقاف التشغيل', terminal: false },
            { code: 'disposed', labelEn: 'Disposed', labelAr: 'تم التخلص', terminal: true },
            { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
        ],
    };
}
async function seedAssetModule(tenantId, schema) {
    const data = getAssetSeedData();
    const { safeQuery } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js')));
    for (const [key, value] of Object.entries(data.defaultConfigs)) {
        await safeQuery(`INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`, ['asset', key, JSON.stringify(value), tenantId]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
}
//# sourceMappingURL=asset-seed.js.map