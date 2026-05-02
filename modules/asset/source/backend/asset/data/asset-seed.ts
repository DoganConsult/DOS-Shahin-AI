import { ASSET_LIMITS, ASSET_TIMEOUTS, ASSET_BUSINESS_THRESHOLDS as _ASSET_BUSINESS_THRESHOLDS } from './asset-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

/**
 * Design-token color references for seed data.
 * Maps semantic meaning to CSS custom property names from grc-tokens.css.
 * At seed time these are stored as token references; the frontend resolves them at render.
 */
const SEED_COLORS = {
  top_secret:   'var(--severity-critical)',
  restricted:   'var(--error)',
  confidential: 'var(--severity-high)',
  internal:     'var(--severity-medium)',
  public:       'var(--severity-low)',
} as const;

export interface AssetSeedData {
  defaultConfigs: Record<string, unknown>;
  assetTypes: Array<{ code: string; labelEn: string; labelAr: string }>;
  classificationLevels: Array<{ code: string; labelEn: string; labelAr: string; color: string }>;
  criticalityLevels: Array<{ code: string; labelEn: string; labelAr: string; slaHours: number }>;
  ownershipTypes: Array<{ code: string; labelEn: string; labelAr: string }>;
  environments: Array<{ code: string; labelEn: string; labelAr: string }>;
  assetStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getAssetSeedData(): AssetSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'asset',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: ASSET_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      reviewCycleDays: ASSET_TIMEOUTS.REVIEW_CYCLE_DAYS,
      maxLinkedRisks: ASSET_LIMITS.MAX_LINKED_RISKS,
      maxLinkedControls: ASSET_LIMITS.MAX_LINKED_CONTROLS,
      maxCustomAttributes: ASSET_LIMITS.MAX_CUSTOM_ATTRIBUTES,
      maxExportRows: ASSET_LIMITS.MAX_EXPORT_ROWS,
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

export async function seedAssetModule(tenantId: string, schema: string): Promise<void> {
  const data = getAssetSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['asset', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
