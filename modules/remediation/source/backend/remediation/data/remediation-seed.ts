import { REMEDIATION_LIMITS, REMEDIATION_TIMEOUTS, REMEDIATION_BUSINESS_THRESHOLDS } from './remediation-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface RemediationSeedData {
  defaultConfigs: Record<string, unknown>;
  remediationTypes: Array<{ code: string; labelEn: string; labelAr: string; defaultPriority: string }>;
  sourceTypes: Array<{ code: string; labelEn: string; labelAr: string; moduleLink: string | null }>;
  verificationMethods: Array<{ code: string; labelEn: string; labelAr: string; automated: boolean }>;
  remediationStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  priorities: Array<{ code: string; labelEn: string; labelAr: string; slaHours: number }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getRemediationSeedData(): RemediationSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'remediation',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: REMEDIATION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxLinkedFindings: REMEDIATION_LIMITS.MAX_LINKED_FINDINGS,
      maxLinkedControls: REMEDIATION_LIMITS.MAX_LINKED_CONTROLS,
      maxMilestones: REMEDIATION_LIMITS.MAX_MILESTONES,
      escalationAfterHours: REMEDIATION_TIMEOUTS.ESCALATION_AFTER_HOURS,
      overdueWarningDays: REMEDIATION_BUSINESS_THRESHOLDS.OVERDUE_WARNING_DAYS,
      maxExportRows: REMEDIATION_LIMITS.MAX_EXPORT_ROWS,
    },
    remediationTypes: [
      { code: 'technical', labelEn: 'Technical Fix', labelAr: 'إصلاح تقني', defaultPriority: 'high' },
      { code: 'process', labelEn: 'Process Improvement', labelAr: 'تحسين عملية', defaultPriority: 'medium' },
      { code: 'policy', labelEn: 'Policy Update', labelAr: 'تحديث سياسة', defaultPriority: 'medium' },
      { code: 'training', labelEn: 'Training & Awareness', labelAr: 'تدريب وتوعية', defaultPriority: 'low' },
      { code: 'compensating_control', labelEn: 'Compensating Control', labelAr: 'ضابط تعويضي', defaultPriority: 'high' },
      { code: 'risk_acceptance', labelEn: 'Risk Acceptance', labelAr: 'قبول المخاطر', defaultPriority: 'medium' },
    ],
    sourceTypes: [
      { code: 'audit_finding', labelEn: 'Audit Finding', labelAr: 'نتيجة تدقيق', moduleLink: 'audit' },
      { code: 'vulnerability', labelEn: 'Vulnerability', labelAr: 'ثغرة أمنية', moduleLink: 'risk' },
      { code: 'incident', labelEn: 'Incident Response', labelAr: 'استجابة حادث', moduleLink: 'incident' },
      { code: 'risk', labelEn: 'Risk Treatment', labelAr: 'معالجة مخاطر', moduleLink: 'risk' },
      { code: 'compliance_gap', labelEn: 'Compliance Gap', labelAr: 'فجوة امتثال', moduleLink: 'compliance' },
      { code: 'self_identified', labelEn: 'Self-Identified', labelAr: 'محدد ذاتياً', moduleLink: null },
    ],
    verificationMethods: [
      { code: 'automated_scan', labelEn: 'Automated Scan', labelAr: 'فحص آلي', automated: true },
      { code: 'manual_test', labelEn: 'Manual Testing', labelAr: 'اختبار يدوي', automated: false },
      { code: 'evidence_review', labelEn: 'Evidence Review', labelAr: 'مراجعة أدلة', automated: false },
      { code: 'third_party_audit', labelEn: 'Third-Party Audit', labelAr: 'تدقيق طرف ثالث', automated: false },
      { code: 'penetration_test', labelEn: 'Penetration Test', labelAr: 'اختبار اختراق', automated: false },
    ],
    remediationStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ', terminal: false },
      { code: 'pending_verification', labelEn: 'Pending Verification', labelAr: 'في انتظار التحقق', terminal: false },
      { code: 'verified', labelEn: 'Verified', labelAr: 'تم التحقق', terminal: false },
      { code: 'failed', labelEn: 'Verification Failed', labelAr: 'فشل التحقق', terminal: false },
      { code: 'closed', labelEn: 'Closed', labelAr: 'مغلق', terminal: true },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
    priorities: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', slaHours: 24 },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع', slaHours: 72 },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', slaHours: 168 },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض', slaHours: 720 },
    ],
  };
}

export async function seedRemediationModule(tenantId: string, schema: string): Promise<void> {
  const data = getRemediationSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['remediation', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
