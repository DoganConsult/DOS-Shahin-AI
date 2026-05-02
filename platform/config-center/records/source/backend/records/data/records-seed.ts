import { RECORDS_LIMITS, RECORDS_TIMEOUTS, RECORDS_BUSINESS_THRESHOLDS } from './records-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface RetentionPolicySeed {
  code: string;
  nameEn: string;
  nameAr: string;
  recordType: string;
  classification: string;
  retentionDays: number;
  legalBasis: string;
}

export interface RecordsSeedData {
  defaultConfigs: Record<string, unknown>;
  retentionPolicies: RetentionPolicySeed[];
  recordTypes: Array<{ code: string; labelEn: string; labelAr: string }>;
  classifications: Array<{ code: string; labelEn: string; labelAr: string; retentionMultiplier: number }>;
  disposalMethods: Array<{ code: string; labelEn: string; labelAr: string }>;
  recordStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getRecordsSeedData(): RecordsSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'records',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: RECORDS_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      retentionWarningDays: RECORDS_BUSINESS_THRESHOLDS.RETENTION_WARNING_DAYS,
      disposalGraceDays: RECORDS_TIMEOUTS.DISPOSAL_GRACE_DAYS,
      reviewTimeoutDays: RECORDS_TIMEOUTS.REVIEW_TIMEOUT_DAYS,
      legalHoldReviewDays: RECORDS_BUSINESS_THRESHOLDS.LEGAL_HOLD_REVIEW_DAYS,
      maxExportRows: RECORDS_LIMITS.MAX_EXPORT_ROWS,
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

export async function seedRecordsModule(tenantId: string, schema: string): Promise<void> {
  const data = getRecordsSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['records', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }

  for (const pol of data.retentionPolicies) {
    await safeQuery(
      `INSERT INTO "${schema}".record_retention_policies (name, record_type, classification, retention_days, legal_basis, is_active, tenant_id)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       ON CONFLICT DO NOTHING`,
      [pol.nameEn, pol.recordType, pol.classification, pol.retentionDays, pol.legalBasis, tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
