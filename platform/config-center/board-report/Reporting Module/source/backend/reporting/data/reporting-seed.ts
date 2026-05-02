import { REPORTING_LIMITS, REPORTING_TIMEOUTS, REPORTING_BUSINESS_THRESHOLDS } from './reporting-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface ReportingSeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  reportTypes: Array<{ code: string; labelEn: string; labelAr: string; defaultFormat: string; requiresApproval: boolean }>;
  outputFormats: Array<{ code: string; labelEn: string; labelAr: string; mimeType: string; extension: string }>;
  scheduleFrequencies: Array<{ code: string; labelEn: string; labelAr: string; cron: string; order: number }>;
  distributionMethods: Array<{ code: string; labelEn: string; labelAr: string; requiresConfig: boolean }>;
  reportStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getReportingSeedData(): ReportingSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'reporting',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: REPORTING_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: REPORTING_LIMITS.MAX_TITLE_LENGTH > 0 ? 50 : 50,
      maxReportSizeMb: REPORTING_LIMITS.MAX_REPORT_SIZE_MB,
      maxExportRows: REPORTING_LIMITS.MAX_EXPORT_ROWS,
      maxDistributionRecipients: REPORTING_LIMITS.MAX_DISTRIBUTION_RECIPIENTS,
      generationTimeoutSeconds: REPORTING_TIMEOUTS.GENERATION_TIMEOUT_SECONDS,
      reportExpiryDays: REPORTING_TIMEOUTS.REPORT_EXPIRY_DAYS,
      distributionRetryMax: REPORTING_BUSINESS_THRESHOLDS.DISTRIBUTION_RETRY_MAX,
      warningThresholdPct: REPORTING_BUSINESS_THRESHOLDS.WARNING_PERCENTAGE,
      criticalThresholdPct: REPORTING_BUSINESS_THRESHOLDS.CRITICAL_PERCENTAGE,
      staleAfterDays: REPORTING_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS,
    },
    defaultTemplates: [
      {
        code: 'reporting_compliance',
        nameEn: 'Compliance Report Template',
        nameAr: 'قالب تقرير الامتثال',
        data: { version: 1, fields: ['control_id', 'status', 'evidence', 'owner'], layout: 'tabular' },
      },
      {
        code: 'reporting_executive',
        nameEn: 'Executive Summary Template',
        nameAr: 'قالب ملخص تنفيذي',
        data: { version: 1, fields: ['kpi', 'trend', 'risk_summary', 'action_items'], layout: 'dashboard' },
      },
      {
        code: 'reporting_default',
        nameEn: 'Default Reporting Template',
        nameAr: 'قالب التقرير الافتراضي',
        data: { version: 1, fields: [], layout: 'standard' },
      },
    ],
    reportTypes: [
      { code: 'compliance', labelEn: 'Compliance Report', labelAr: 'تقرير الامتثال', defaultFormat: 'pdf', requiresApproval: true },
      { code: 'risk', labelEn: 'Risk Report', labelAr: 'تقرير المخاطر', defaultFormat: 'pdf', requiresApproval: true },
      { code: 'audit', labelEn: 'Audit Report', labelAr: 'تقرير التدقيق', defaultFormat: 'pdf', requiresApproval: true },
      { code: 'executive', labelEn: 'Executive Summary', labelAr: 'الملخص التنفيذي', defaultFormat: 'pdf', requiresApproval: false },
      { code: 'incident', labelEn: 'Incident Report', labelAr: 'تقرير الحوادث', defaultFormat: 'pdf', requiresApproval: false },
      { code: 'vendor', labelEn: 'Vendor Report', labelAr: 'تقرير الموردين', defaultFormat: 'excel', requiresApproval: false },
      { code: 'asset', labelEn: 'Asset Report', labelAr: 'تقرير الأصول', defaultFormat: 'excel', requiresApproval: false },
      { code: 'kpi', labelEn: 'KPI Dashboard', labelAr: 'لوحة مؤشرات الأداء', defaultFormat: 'html', requiresApproval: false },
      { code: 'custom', labelEn: 'Custom Report', labelAr: 'تقرير مخصص', defaultFormat: 'pdf', requiresApproval: false },
    ],
    outputFormats: [
      { code: 'pdf', labelEn: 'PDF Document', labelAr: 'وثيقة PDF', mimeType: 'application/pdf', extension: '.pdf' },
      { code: 'excel', labelEn: 'Excel Spreadsheet', labelAr: 'جدول بيانات Excel', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: '.xlsx' },
      { code: 'csv', labelEn: 'CSV File', labelAr: 'ملف CSV', mimeType: 'text/csv', extension: '.csv' },
      { code: 'html', labelEn: 'HTML Page', labelAr: 'صفحة HTML', mimeType: 'text/html', extension: '.html' },
      { code: 'word', labelEn: 'Word Document', labelAr: 'وثيقة Word', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx' },
    ],
    scheduleFrequencies: [
      { code: 'daily', labelEn: 'Daily', labelAr: 'يومي', cron: '0 6 * * *', order: 1 },
      { code: 'weekly', labelEn: 'Weekly', labelAr: 'أسبوعي', cron: '0 6 * * 1', order: 2 },
      { code: 'biweekly', labelEn: 'Bi-Weekly', labelAr: 'كل أسبوعين', cron: '0 6 1,15 * *', order: 3 },
      { code: 'monthly', labelEn: 'Monthly', labelAr: 'شهري', cron: '0 6 1 * *', order: 4 },
      { code: 'quarterly', labelEn: 'Quarterly', labelAr: 'ربع سنوي', cron: '0 6 1 1,4,7,10 *', order: 5 },
      { code: 'annually', labelEn: 'Annually', labelAr: 'سنوي', cron: '0 6 1 1 *', order: 6 },
    ],
    distributionMethods: [
      { code: 'email', labelEn: 'Email', labelAr: 'البريد الإلكتروني', requiresConfig: false },
      { code: 'sftp', labelEn: 'SFTP', labelAr: 'نقل آمن للملفات', requiresConfig: true },
      { code: 'api', labelEn: 'API Webhook', labelAr: 'خطاف الويب', requiresConfig: true },
      { code: 'portal', labelEn: 'Portal Download', labelAr: 'تنزيل من البوابة', requiresConfig: false },
      { code: 'sharepoint', labelEn: 'SharePoint', labelAr: 'شيربوينت', requiresConfig: true },
    ],
    reportStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'scheduled', labelEn: 'Scheduled', labelAr: 'مجدول', terminal: false },
      { code: 'generating', labelEn: 'Generating', labelAr: 'قيد الإنشاء', terminal: false },
      { code: 'completed', labelEn: 'Completed', labelAr: 'مكتمل', terminal: false },
      { code: 'failed', labelEn: 'Failed', labelAr: 'فشل', terminal: false },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
  };
}

export async function seedReportingModule(tenantId: string, schema: string): Promise<void> {
  const data = getReportingSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['reporting', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
