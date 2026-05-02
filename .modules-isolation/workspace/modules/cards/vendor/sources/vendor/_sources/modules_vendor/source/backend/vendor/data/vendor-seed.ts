import { VENDOR_LIMITS, VENDOR_TIMEOUTS, VENDOR_BUSINESS_THRESHOLDS } from './vendor-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

/**
 * Design-token color references for seed data.
 * Maps semantic meaning to CSS custom property names from grc-tokens.css.
 * At seed time these are stored as token references; the frontend resolves them at render.
 */
const SEED_COLORS = {
  critical: 'var(--severity-critical)',
  high:     'var(--error)',
  medium:   'var(--severity-high)',
  low:      'var(--severity-low)',
} as const;

export interface VendorSeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  vendorCategories: Array<{ code: string; labelEn: string; labelAr: string }>;
  riskRatings: Array<{ code: string; labelEn: string; labelAr: string; color: string; reassessmentIntervalDays: number }>;
  assessmentTypes: Array<{ code: string; labelEn: string; labelAr: string; domains: string[] }>;
  contractStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  dueDiligenceCategories: Array<{ code: string; labelEn: string; labelAr: string }>;
  vendorStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getVendorSeedData(): VendorSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'vendor',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: VENDOR_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      contractExpiryReminderDays: VENDOR_TIMEOUTS.CONTRACT_EXPIRY_REMINDER_DAYS,
      reassessmentIntervalDays: 365,
      highRiskReassessmentIntervalDays: 180,
      criticalRiskReassessmentIntervalDays: 90,
      maxContactsPerVendor: VENDOR_LIMITS.MAX_CONTACTS_PER_VENDOR,
      maxContractsPerVendor: VENDOR_LIMITS.MAX_CONTRACTS_PER_VENDOR,
      maxQuestionnaireItems: VENDOR_LIMITS.MAX_QUESTIONNAIRE_ITEMS,
      maxExportRows: VENDOR_LIMITS.MAX_EXPORT_ROWS,
      warningThresholdPercentage: VENDOR_BUSINESS_THRESHOLDS.WARNING_PERCENTAGE,
      criticalThresholdPercentage: VENDOR_BUSINESS_THRESHOLDS.CRITICAL_PERCENTAGE,
      staleAfterDays: VENDOR_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS,
    },
    defaultTemplates: [
      {
        code: 'vendor_default',
        nameEn: 'Standard Vendor Onboarding Template',
        nameAr: 'نموذج إعداد البائع القياسي',
        data: { version: 1, fields: [], layout: 'standard', sections: ['general', 'risk', 'compliance', 'contracts'] },
      },
      {
        code: 'vendor_due_diligence',
        nameEn: 'Due Diligence Questionnaire',
        nameAr: 'استبيان العناية الواجبة',
        data: { version: 1, fields: [], layout: 'form', domains: ['information_security', 'data_privacy', 'business_continuity'] },
      },
    ],
    vendorCategories: [
      { code: 'technology', labelEn: 'Technology', labelAr: 'تقنية المعلومات' },
      { code: 'cloud', labelEn: 'Cloud Services', labelAr: 'الخدمات السحابية' },
      { code: 'professional_services', labelEn: 'Professional Services', labelAr: 'الخدمات المهنية' },
      { code: 'consulting', labelEn: 'Consulting', labelAr: 'الاستشارات' },
      { code: 'outsourcing', labelEn: 'Outsourcing', labelAr: 'الاستعانة بمصادر خارجية' },
      { code: 'data_processing', labelEn: 'Data Processing', labelAr: 'معالجة البيانات' },
      { code: 'infrastructure', labelEn: 'Infrastructure', labelAr: 'البنية التحتية' },
      { code: 'financial', labelEn: 'Financial Services', labelAr: 'الخدمات المالية' },
      { code: 'legal', labelEn: 'Legal', labelAr: 'الخدمات القانونية' },
      { code: 'logistics', labelEn: 'Logistics', labelAr: 'اللوجستيات' },
      { code: 'marketing', labelEn: 'Marketing', labelAr: 'التسويق' },
      { code: 'hr', labelEn: 'Human Resources', labelAr: 'الموارد البشرية' },
      { code: 'security', labelEn: 'Security', labelAr: 'الأمن' },
    ],
    riskRatings: [
      { code: 'critical', labelEn: 'Critical Risk', labelAr: 'مخاطر حرجة', color: SEED_COLORS.critical, reassessmentIntervalDays: 90 },
      { code: 'high', labelEn: 'High Risk', labelAr: 'مخاطر مرتفعة', color: SEED_COLORS.high, reassessmentIntervalDays: 180 },
      { code: 'medium', labelEn: 'Medium Risk', labelAr: 'مخاطر متوسطة', color: SEED_COLORS.medium, reassessmentIntervalDays: 365 },
      { code: 'low', labelEn: 'Low Risk', labelAr: 'مخاطر منخفضة', color: SEED_COLORS.low, reassessmentIntervalDays: 730 },
    ],
    assessmentTypes: [
      { code: 'initial', labelEn: 'Initial Assessment', labelAr: 'التقييم الأولي', domains: ['information_security', 'data_privacy', 'compliance'] },
      { code: 'annual', labelEn: 'Annual Review', labelAr: 'المراجعة السنوية', domains: ['information_security', 'data_privacy', 'business_continuity', 'financial_stability', 'compliance'] },
      { code: 'event_triggered', labelEn: 'Event-Triggered Assessment', labelAr: 'تقييم بسبب حدث طارئ', domains: ['information_security', 'operational_resilience'] },
      { code: 'enhanced', labelEn: 'Enhanced Due Diligence', labelAr: 'العناية الواجبة المعززة', domains: ['information_security', 'data_privacy', 'business_continuity', 'financial_stability', 'compliance', 'esg', 'operational_resilience'] },
      { code: 'simplified', labelEn: 'Simplified Assessment', labelAr: 'تقييم مبسط', domains: ['compliance'] },
    ],
    contractStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'under_review', labelEn: 'Under Review', labelAr: 'قيد المراجعة', terminal: false },
      { code: 'active', labelEn: 'Active', labelAr: 'ساري', terminal: false },
      { code: 'expiring_soon', labelEn: 'Expiring Soon', labelAr: 'ينتهي قريباً', terminal: false },
      { code: 'expired', labelEn: 'Expired', labelAr: 'منتهي', terminal: true },
      { code: 'terminated', labelEn: 'Terminated', labelAr: 'محلول', terminal: true },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
    dueDiligenceCategories: [
      { code: 'information_security', labelEn: 'Information Security', labelAr: 'أمن المعلومات' },
      { code: 'data_privacy', labelEn: 'Data Privacy & GDPR', labelAr: 'خصوصية البيانات والامتثال' },
      { code: 'business_continuity', labelEn: 'Business Continuity', labelAr: 'استمرارية الأعمال' },
      { code: 'financial_stability', labelEn: 'Financial Stability', labelAr: 'الاستقرار المالي' },
      { code: 'compliance', labelEn: 'Regulatory Compliance', labelAr: 'الامتثال التنظيمي' },
      { code: 'esg', labelEn: 'ESG & Sustainability', labelAr: 'الحوكمة البيئية والاجتماعية' },
      { code: 'operational_resilience', labelEn: 'Operational Resilience', labelAr: 'المرونة التشغيلية' },
      { code: 'subcontractors', labelEn: 'Subcontractors & Supply Chain', labelAr: 'المقاولون والسلسلة التوريدية' },
    ],
    vendorStatuses: [
      { code: 'prospect', labelEn: 'Prospect', labelAr: 'مرشح', terminal: false },
      { code: 'onboarding', labelEn: 'Onboarding', labelAr: 'قيد الإعداد', terminal: false },
      { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false },
      { code: 'under_review', labelEn: 'Under Review', labelAr: 'قيد المراجعة', terminal: false },
      { code: 'suspended', labelEn: 'Suspended', labelAr: 'موقوف', terminal: false },
      { code: 'offboarding', labelEn: 'Offboarding', labelAr: 'قيد إنهاء التعامل', terminal: false },
      { code: 'terminated', labelEn: 'Terminated', labelAr: 'منتهي التعامل', terminal: true },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
  };
}

export async function seedVendorModule(tenantId: string, schema: string): Promise<void> {
  const data = getVendorSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['vendor', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
