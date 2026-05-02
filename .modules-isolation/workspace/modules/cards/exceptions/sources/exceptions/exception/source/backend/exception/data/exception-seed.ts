import { EXCEPTION_LIMITS, EXCEPTION_TIMEOUTS, EXCEPTION_BUSINESS_THRESHOLDS } from './exception-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface ExceptionSeedData {
  defaultConfigs: Record<string, unknown>;
  exceptionTypes: Array<{ code: string; labelEn: string; labelAr: string; requiresCompensatingControl: boolean }>;
  riskLevels: Array<{ code: string; labelEn: string; labelAr: string; maxDurationDays: number; approvalChain: string }>;
  approvalChains: Array<{ code: string; labelEn: string; labelAr: string }>;
  exceptionStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  compensatingControlTypes: Array<{ code: string; labelEn: string; labelAr: string }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getExceptionSeedData(): ExceptionSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'exception',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: EXCEPTION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxDurationDays: EXCEPTION_LIMITS.MAX_DURATION_DAYS,
      maxRenewalCount: EXCEPTION_LIMITS.MAX_RENEWAL_COUNT,
      maxApprovers: EXCEPTION_LIMITS.MAX_APPROVERS,
      expiryReminderDays: EXCEPTION_TIMEOUTS.EXPIRY_REMINDER_DAYS,
      expiryWarningDays: EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_WARNING_DAYS,
      expiryCriticalDays: EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_CRITICAL_DAYS,
      maxExportRows: EXCEPTION_LIMITS.MAX_EXPORT_ROWS,
    },
    exceptionTypes: [
      { code: 'policy', labelEn: 'Policy Exception', labelAr: 'استثناء سياسة', requiresCompensatingControl: true },
      { code: 'control', labelEn: 'Control Exception', labelAr: 'استثناء ضابط', requiresCompensatingControl: true },
      { code: 'technical', labelEn: 'Technical Exception', labelAr: 'استثناء تقني', requiresCompensatingControl: true },
      { code: 'process', labelEn: 'Process Exception', labelAr: 'استثناء عملية', requiresCompensatingControl: false },
      { code: 'regulatory', labelEn: 'Regulatory Exception', labelAr: 'استثناء تنظيمي', requiresCompensatingControl: true },
      { code: 'security', labelEn: 'Security Exception', labelAr: 'استثناء أمني', requiresCompensatingControl: true },
    ],
    riskLevels: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', maxDurationDays: 90, approvalChain: 'sequential' },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع', maxDurationDays: 180, approvalChain: 'sequential' },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', maxDurationDays: 365, approvalChain: 'single' },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض', maxDurationDays: 730, approvalChain: 'single' },
    ],
    approvalChains: [
      { code: 'single', labelEn: 'Single Approver', labelAr: 'موافق واحد' },
      { code: 'sequential', labelEn: 'Sequential Approval', labelAr: 'موافقة متسلسلة' },
      { code: 'parallel', labelEn: 'Parallel Approval', labelAr: 'موافقة متوازية' },
      { code: 'majority', labelEn: 'Majority Approval', labelAr: 'موافقة الأغلبية' },
    ],
    exceptionStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'pending', labelEn: 'Pending Approval', labelAr: 'في انتظار الموافقة', terminal: false },
      { code: 'approved', labelEn: 'Approved', labelAr: 'موافق عليه', terminal: false },
      { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false },
      { code: 'expired', labelEn: 'Expired', labelAr: 'منتهي الصلاحية', terminal: false },
      { code: 'revoked', labelEn: 'Revoked', labelAr: 'ملغي', terminal: true },
      { code: 'closed', labelEn: 'Closed', labelAr: 'مغلق', terminal: true },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
    compensatingControlTypes: [
      { code: 'monitoring', labelEn: 'Enhanced Monitoring', labelAr: 'مراقبة معززة' },
      { code: 'manual_review', labelEn: 'Manual Review Process', labelAr: 'عملية مراجعة يدوية' },
      { code: 'alternate_control', labelEn: 'Alternate Control', labelAr: 'ضابط بديل' },
      { code: 'risk_transfer', labelEn: 'Risk Transfer (Insurance)', labelAr: 'نقل المخاطر (تأمين)' },
      { code: 'time_limitation', labelEn: 'Time Limitation', labelAr: 'تقييد زمني' },
    ],
  };
}

export async function seedExceptionModule(tenantId: string, schema: string): Promise<void> {
  const data = getExceptionSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['exception', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
