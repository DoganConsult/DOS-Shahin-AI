import { PRIVACY_LIMITS, PRIVACY_TIMEOUTS, PRIVACY_BUSINESS_THRESHOLDS } from './privacy-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface PrivacySeedData {
  defaultConfigs: Record<string, unknown>;
  dsrTypes: Array<{ code: string; labelEn: string; labelAr: string; slaDays: number }>;
  regulations: Array<{ code: string; labelEn: string; labelAr: string; jurisdiction: string }>;
  consentPurposes: Array<{ code: string; labelEn: string; labelAr: string; retentionDays: number }>;
  breachSeverities: Array<{ code: string; labelEn: string; labelAr: string; notificationHours: number }>;
  piaCategories: Array<{ code: string; labelEn: string; labelAr: string }>;
  privacyStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getPrivacySeedData(): PrivacySeedData {
  return {
    defaultConfigs: {
      moduleCode: 'privacy',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: PRIVACY_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      dsrResponseDays: PRIVACY_TIMEOUTS.DSR_RESPONSE_DAYS,
      breachNotificationHours: PRIVACY_TIMEOUTS.BREACH_NOTIFICATION_HOURS,
      piaCompletionDays: PRIVACY_TIMEOUTS.PIA_COMPLETION_DAYS,
      consentExpiryWarningDays: PRIVACY_BUSINESS_THRESHOLDS.CONSENT_EXPIRY_WARNING_DAYS,
      maxExportRows: PRIVACY_LIMITS.MAX_EXPORT_ROWS,
    },
    dsrTypes: [
      { code: 'access', labelEn: 'Right of Access', labelAr: 'حق الوصول', slaDays: 30 },
      { code: 'erasure', labelEn: 'Right to Erasure', labelAr: 'حق المحو', slaDays: 30 },
      { code: 'rectification', labelEn: 'Right to Rectification', labelAr: 'حق التصحيح', slaDays: 30 },
      { code: 'portability', labelEn: 'Right to Data Portability', labelAr: 'حق نقل البيانات', slaDays: 30 },
      { code: 'restriction', labelEn: 'Right to Restrict Processing', labelAr: 'حق تقييد المعالجة', slaDays: 30 },
      { code: 'objection', labelEn: 'Right to Object', labelAr: 'حق الاعتراض', slaDays: 30 },
      { code: 'automated_decision', labelEn: 'Automated Decision Review', labelAr: 'مراجعة القرار الآلي', slaDays: 30 },
    ],
    regulations: [
      { code: 'pdpl', labelEn: 'Saudi PDPL', labelAr: 'نظام حماية البيانات الشخصية السعودي', jurisdiction: 'KSA' },
      { code: 'gdpr', labelEn: 'EU GDPR', labelAr: 'النظام الأوروبي لحماية البيانات', jurisdiction: 'EU' },
      { code: 'ccpa', labelEn: 'California CCPA', labelAr: 'قانون خصوصية المستهلك في كاليفورنيا', jurisdiction: 'US-CA' },
      { code: 'nca_ecc', labelEn: 'NCA Essential Cybersecurity Controls', labelAr: 'ضوابط الأمن السيبراني الأساسية', jurisdiction: 'KSA' },
      { code: 'internal', labelEn: 'Internal Policy', labelAr: 'سياسة داخلية', jurisdiction: 'Internal' },
    ],
    consentPurposes: [
      { code: 'marketing', labelEn: 'Marketing Communications', labelAr: 'اتصالات تسويقية', retentionDays: 365 },
      { code: 'analytics', labelEn: 'Analytics & Profiling', labelAr: 'تحليلات وتنميط', retentionDays: 730 },
      { code: 'service', labelEn: 'Service Delivery', labelAr: 'تقديم الخدمة', retentionDays: 1095 },
      { code: 'legal', labelEn: 'Legal Obligation', labelAr: 'التزام قانوني', retentionDays: 2555 },
      { code: 'research', labelEn: 'Research & Development', labelAr: 'البحث والتطوير', retentionDays: 730 },
    ],
    breachSeverities: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', notificationHours: 24 },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع', notificationHours: 48 },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', notificationHours: 72 },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض', notificationHours: 168 },
    ],
    piaCategories: [
      { code: 'new_system', labelEn: 'New System/Application', labelAr: 'نظام/تطبيق جديد' },
      { code: 'data_sharing', labelEn: 'Data Sharing Agreement', labelAr: 'اتفاقية مشاركة البيانات' },
      { code: 'cross_border', labelEn: 'Cross-Border Transfer', labelAr: 'نقل عبر الحدود' },
      { code: 'vendor_engagement', labelEn: 'Vendor Engagement', labelAr: 'تعاقد مع مورد' },
      { code: 'process_change', labelEn: 'Process Change', labelAr: 'تغيير في العمليات' },
    ],
    privacyStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'submitted', labelEn: 'Submitted', labelAr: 'مقدم', terminal: false },
      { code: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ', terminal: false },
      { code: 'pending_review', labelEn: 'Pending Review', labelAr: 'في انتظار المراجعة', terminal: false },
      { code: 'completed', labelEn: 'Completed', labelAr: 'مكتمل', terminal: false },
      { code: 'closed', labelEn: 'Closed', labelAr: 'مغلق', terminal: true },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
  };
}

export async function seedPrivacyModule(tenantId: string, schema: string): Promise<void> {
  const data = getPrivacySeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['privacy', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
