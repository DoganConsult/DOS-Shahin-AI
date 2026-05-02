import { PORTALS_LIMITS, PORTALS_TIMEOUTS, PORTALS_BUSINESS_THRESHOLDS } from './portals-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface PortalTemplateSeed {
  code: string;
  nameEn: string;
  nameAr: string;
  portalType: string;
  data: Record<string, unknown>;
}

export interface PageTemplateSeed {
  code: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  layout: string;
}

export interface WidgetPresetSeed {
  code: string;
  widgetType: string;
  titleEn: string;
  titleAr: string;
  config: Record<string, unknown>;
}

export interface PortalsSeedData {
  defaultConfigs: Record<string, unknown>;
  portalTemplates: PortalTemplateSeed[];
  pageTemplates: PageTemplateSeed[];
  widgetPresets: WidgetPresetSeed[];
  accessLevels: Array<{ code: string; labelEn: string; labelAr: string }>;
  portalStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getPortalsSeedData(): PortalsSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'portals',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: PORTALS_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      sessionTimeoutMinutes: PORTALS_TIMEOUTS.SESSION_TIMEOUT_MINUTES,
      portalSessionMinutes: PORTALS_TIMEOUTS.PORTAL_SESSION_MINUTES,
      maxConcurrentVisitors: PORTALS_BUSINESS_THRESHOLDS.MAX_CONCURRENT_VISITORS,
      maxUploadSizeMb: PORTALS_LIMITS.MAX_SESSION_CONCURRENT,
      staleAfterDays: PORTALS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS,
    },
    portalTemplates: [
      { code: 'portal_vendor', nameEn: 'Vendor Portal', nameAr: 'بوابة الموردين', portalType: 'vendor', data: { version: 1, features: ['questionnaire', 'document_upload', 'status_view', 'contract_review'], layout: 'vendor_standard', requireMfa: false, sessionTimeout: 60 } },
      { code: 'portal_auditor', nameEn: 'Auditor Portal', nameAr: 'بوابة المدقق', portalType: 'auditor', data: { version: 1, features: ['evidence_review', 'finding_submission', 'control_assessment', 'report_download'], layout: 'auditor_standard', requireMfa: true, sessionTimeout: 30 } },
      { code: 'portal_partner', nameEn: 'Partner Portal', nameAr: 'بوابة الشريك', portalType: 'partner', data: { version: 1, features: ['shared_dashboard', 'joint_assessment', 'document_exchange', 'communication'], layout: 'partner_standard', requireMfa: false, sessionTimeout: 60 } },
      { code: 'portal_public', nameEn: 'Public Disclosure Portal', nameAr: 'بوابة الإفصاح العام', portalType: 'public', data: { version: 1, features: ['policy_view', 'compliance_status', 'contact_form', 'incident_report'], layout: 'public_standard', requireMfa: false, sessionTimeout: 120 } },
      { code: 'portal_regulator', nameEn: 'Regulator Portal', nameAr: 'بوابة الجهة الرقابية', portalType: 'auditor', data: { version: 1, features: ['compliance_report', 'evidence_access', 'regulatory_submission', 'audit_trail'], layout: 'regulator_standard', requireMfa: true, sessionTimeout: 30 } },
    ],
    pageTemplates: [
      { code: 'page_welcome', titleEn: 'Welcome', titleAr: 'مرحباً', slug: 'welcome', layout: 'hero' },
      { code: 'page_documents', titleEn: 'Documents', titleAr: 'المستندات', slug: 'documents', layout: 'document_list' },
      { code: 'page_questionnaire', titleEn: 'Questionnaire', titleAr: 'الاستبيان', slug: 'questionnaire', layout: 'form' },
      { code: 'page_status', titleEn: 'Status Dashboard', titleAr: 'لوحة الحالة', slug: 'status', layout: 'dashboard' },
      { code: 'page_contact', titleEn: 'Contact', titleAr: 'تواصل معنا', slug: 'contact', layout: 'contact_form' },
      { code: 'page_compliance', titleEn: 'Compliance Overview', titleAr: 'نظرة عامة على الامتثال', slug: 'compliance', layout: 'report' },
    ],
    widgetPresets: [
      { code: 'widget_doc_upload', widgetType: 'document_list', titleEn: 'Document Upload', titleAr: 'رفع المستندات', config: { showUploadButton: true, maxFiles: 20, allowedTypes: ['pdf', 'docx', 'xlsx'] } },
      { code: 'widget_questionnaire', widgetType: 'questionnaire', titleEn: 'Assessment Form', titleAr: 'نموذج التقييم', config: { showProgress: true, allowSave: true } },
      { code: 'widget_progress', widgetType: 'progress_tracker', titleEn: 'Progress Tracker', titleAr: 'متتبع التقدم', config: { showPercentage: true, showSteps: true } },
      { code: 'widget_notice', widgetType: 'notice', titleEn: 'Notice Board', titleAr: 'لوحة الإعلانات', config: { dismissible: true, level: 'info' } },
      { code: 'widget_contact', widgetType: 'contact', titleEn: 'Contact Form', titleAr: 'نموذج التواصل', config: { requireEmail: true, captchaEnabled: true } },
    ],
    accessLevels: [
      { code: 'public', labelEn: 'Public', labelAr: 'عام' },
      { code: 'private', labelEn: 'Private (Token Required)', labelAr: 'خاص (يتطلب رمز)' },
      { code: 'restricted', labelEn: 'Restricted (IP + Token)', labelAr: 'مقيد (عنوان IP + رمز)' },
      { code: 'internal', labelEn: 'Internal Only', labelAr: 'داخلي فقط' },
    ],
    portalStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false },
      { code: 'inactive', labelEn: 'Inactive', labelAr: 'غير نشط', terminal: false },
      { code: 'suspended', labelEn: 'Suspended', labelAr: 'موقوف', terminal: false },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
  };
}

export async function seedPortalsModule(tenantId: string, schema: string): Promise<void> {
  const data = getPortalsSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['portals', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }

  for (const tmpl of data.portalTemplates) {
    await safeQuery(
      `INSERT INTO "${schema}".portal_templates (code, name_en, name_ar, portal_type, template_data, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code, tenant_id) DO NOTHING`,
      [tmpl.code, tmpl.nameEn, tmpl.nameAr, tmpl.portalType, JSON.stringify(tmpl.data), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
