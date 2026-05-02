import type { ModulePermission, ModuleRole, ModuleAction } from '@dos/types';
import { EVIDENCE_MODULE_PERMISSIONS, EVIDENCE_MODULE_ROLES, EVIDENCE_MODULE_ACTIONS } from './evidence-security';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import {
  EVIDENCE_LIMITS,
  EVIDENCE_TIMEOUTS,
  EVIDENCE_SLA_DEFAULTS,
  EVIDENCE_VALIDITY_DEFAULT_DAYS,
  EVIDENCE_TYPES as _EVIDENCE_TYPES,
  EVIDENCE_COLLECTION_METHODS as _EVIDENCE_COLLECTION_METHODS,
  EVIDENCE_QUALITY_SCORES as _EVIDENCE_QUALITY_SCORES,
} from './evidence-constants';

export interface EvidenceSeedData {
  permissions: ModulePermission[];
  roles: ModuleRole[];
  actions: ModuleAction[];
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  evidenceTypes: Array<{ code: string; labelEn: string; labelAr: string; requiresExpiry: boolean; defaultValidityDays: number }>;
  collectionMethods: Array<{ code: string; labelEn: string; labelAr: string; automated: boolean }>;
  reviewTypes: Array<{ code: string; labelEn: string; labelAr: string; requiresApproval: boolean }>;
  complianceFrameworks: Array<{ code: string; labelEn: string; labelAr: string; region: string }>;
  evidenceStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean; requiresReview: boolean }>;
  qualityScores: Array<{ code: string; labelEn: string; labelAr: string; minScore: number; maxScore: number }>;
}

export function getEvidenceSeedData(): EvidenceSeedData {
  return {
    permissions: EVIDENCE_MODULE_PERMISSIONS,
    roles: EVIDENCE_MODULE_ROLES,
    actions: EVIDENCE_MODULE_ACTIONS,
    defaultConfigs: {
      moduleCode: 'evidence',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: EVIDENCE_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxAttachments: EVIDENCE_LIMITS.MAX_ATTACHMENTS,
      maxLinkedControls: EVIDENCE_LIMITS.MAX_LINKED_CONTROLS,
      escalationAfterHours: EVIDENCE_TIMEOUTS.ESCALATION_AFTER_HOURS,
      defaultSlaHours: EVIDENCE_TIMEOUTS.DEFAULT_SLA_HOURS,
      slaDefaults: EVIDENCE_SLA_DEFAULTS,
      defaultValidityDays: EVIDENCE_VALIDITY_DEFAULT_DAYS,
      maxExportRows: EVIDENCE_LIMITS.MAX_EXPORT_ROWS,
      freshnessCheckEnabled: true,
      complianceCoverageReportEnabled: true,
      autoExpireEnabled: true,
    },
    defaultTemplates: [
      {
        code: 'evidence_default',
        nameEn: 'Default Evidence Template',
        nameAr: 'قالب الأدلة الافتراضي',
        data: { version: 1, fields: [], layout: 'standard' },
      },
      {
        code: 'evidence_audit',
        nameEn: 'Audit Evidence Template',
        nameAr: 'قالب أدلة المراجعة',
        data: { version: 1, fields: ['auditor', 'audit_period', 'scope', 'findings'], layout: 'audit' },
      },
      {
        code: 'evidence_technical',
        nameEn: 'Technical Evidence Template',
        nameAr: 'قالب الأدلة التقنية',
        data: { version: 1, fields: ['system', 'tool', 'config_hash', 'timestamp'], layout: 'technical' },
      },
    ],
    evidenceTypes: [
      { code: 'document', labelEn: 'Document', labelAr: 'وثيقة', requiresExpiry: true, defaultValidityDays: EVIDENCE_VALIDITY_DEFAULT_DAYS },
      { code: 'screenshot', labelEn: 'Screenshot', labelAr: 'لقطة شاشة', requiresExpiry: false, defaultValidityDays: 90 },
      { code: 'log_export', labelEn: 'Log Export', labelAr: 'تصدير السجلات', requiresExpiry: false, defaultValidityDays: 180 },
      { code: 'system_output', labelEn: 'System Output', labelAr: 'مخرجات النظام', requiresExpiry: false, defaultValidityDays: 90 },
      { code: 'config_snapshot', labelEn: 'Configuration Snapshot', labelAr: 'لقطة الإعدادات', requiresExpiry: true, defaultValidityDays: 180 },
      { code: 'attestation', labelEn: 'Attestation', labelAr: 'إفادة رسمية', requiresExpiry: true, defaultValidityDays: EVIDENCE_VALIDITY_DEFAULT_DAYS },
      { code: 'certificate', labelEn: 'Certificate', labelAr: 'شهادة', requiresExpiry: true, defaultValidityDays: EVIDENCE_VALIDITY_DEFAULT_DAYS },
      { code: 'report', labelEn: 'Report', labelAr: 'تقرير', requiresExpiry: true, defaultValidityDays: EVIDENCE_VALIDITY_DEFAULT_DAYS },
      { code: 'interview_notes', labelEn: 'Interview Notes', labelAr: 'ملاحظات المقابلة', requiresExpiry: false, defaultValidityDays: 180 },
    ],
    collectionMethods: [
      { code: 'manual', labelEn: 'Manual Upload', labelAr: 'رفع يدوي', automated: false },
      { code: 'automated', labelEn: 'Automated Collection', labelAr: 'جمع آلي', automated: true },
      { code: 'api_pull', labelEn: 'API Pull', labelAr: 'سحب عبر API', automated: true },
      { code: 'agent', labelEn: 'Agent-Based', labelAr: 'عبر وكيل', automated: true },
      { code: 'upload', labelEn: 'File Upload', labelAr: 'رفع ملف', automated: false },
      { code: 'connector', labelEn: 'Connector Integration', labelAr: 'تكامل موصل', automated: true },
      { code: 'email', labelEn: 'Email Submission', labelAr: 'إرسال بريد إلكتروني', automated: false },
    ],
    reviewTypes: [
      { code: 'technical', labelEn: 'Technical Review', labelAr: 'مراجعة تقنية', requiresApproval: true },
      { code: 'compliance', labelEn: 'Compliance Review', labelAr: 'مراجعة الامتثال', requiresApproval: true },
      { code: 'quality', labelEn: 'Quality Review', labelAr: 'مراجعة الجودة', requiresApproval: false },
      { code: 'legal', labelEn: 'Legal Review', labelAr: 'مراجعة قانونية', requiresApproval: true },
      { code: 'management', labelEn: 'Management Approval', labelAr: 'موافقة الإدارة', requiresApproval: true },
      { code: 'peer', labelEn: 'Peer Review', labelAr: 'مراجعة الأقران', requiresApproval: false },
    ],
    complianceFrameworks: [
      { code: 'iso27001', labelEn: 'ISO 27001', labelAr: 'آيزو 27001', region: 'global' },
      { code: 'iso27701', labelEn: 'ISO 27701', labelAr: 'آيزو 27701', region: 'global' },
      { code: 'soc2', labelEn: 'SOC 2 Type II', labelAr: 'سوك 2 النوع الثاني', region: 'us' },
      { code: 'nca_eca', labelEn: 'NCA ECA', labelAr: 'الهيئة الوطنية للأمن السيبراني - ECA', region: 'sa' },
      { code: 'nca_ccc', labelEn: 'NCA CCC', labelAr: 'الهيئة الوطنية للأمن السيبراني - CCC', region: 'sa' },
      { code: 'pdpl', labelEn: 'PDPL (Saudi Arabia)', labelAr: 'نظام حماية البيانات الشخصية', region: 'sa' },
      { code: 'gdpr', labelEn: 'GDPR', labelAr: 'اللائحة الأوروبية لحماية البيانات', region: 'eu' },
      { code: 'pci_dss', labelEn: 'PCI DSS', labelAr: 'معيار أمن بيانات بطاقات الدفع', region: 'global' },
      { code: 'hipaa', labelEn: 'HIPAA', labelAr: 'هيبا', region: 'us' },
      { code: 'nist_csf', labelEn: 'NIST CSF', labelAr: 'إطار الأمن السيبراني NIST', region: 'global' },
      { code: 'nist_800_53', labelEn: 'NIST SP 800-53', labelAr: 'NIST SP 800-53', region: 'global' },
      { code: 'sama', labelEn: 'SAMA Cybersecurity Framework', labelAr: 'إطار مؤسسة النقد العربي السعودي', region: 'sa' },
      { code: 'cis', labelEn: 'CIS Controls', labelAr: 'ضوابط CIS', region: 'global' },
    ],
    evidenceStatuses: [
      { code: 'requested', labelEn: 'Requested', labelAr: 'مطلوب', terminal: false, requiresReview: false },
      { code: 'collecting', labelEn: 'Collecting', labelAr: 'قيد الجمع', terminal: false, requiresReview: false },
      { code: 'uploaded', labelEn: 'Uploaded', labelAr: 'تم الرفع', terminal: false, requiresReview: false },
      { code: 'under_review', labelEn: 'Under Review', labelAr: 'قيد المراجعة', terminal: false, requiresReview: true },
      { code: 'verified', labelEn: 'Verified', labelAr: 'تم التحقق', terminal: false, requiresReview: false },
      { code: 'rejected_quality', labelEn: 'Rejected (Quality)', labelAr: 'مرفوض (جودة)', terminal: false, requiresReview: false },
      { code: 'locked', labelEn: 'Locked', labelAr: 'مقفل', terminal: false, requiresReview: false },
      { code: 'released', labelEn: 'Released', labelAr: 'تم الإصدار', terminal: false, requiresReview: false },
      { code: 'pending', labelEn: 'Pending', labelAr: 'معلّق', terminal: false, requiresReview: false },
      { code: 'collected', labelEn: 'Collected', labelAr: 'تم الجمع', terminal: false, requiresReview: false },
      { code: 'rejected', labelEn: 'Rejected', labelAr: 'مرفوض', terminal: false, requiresReview: false },
      { code: 'expired', labelEn: 'Expired', labelAr: 'منتهي الصلاحية', terminal: false, requiresReview: false },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true, requiresReview: false },
    ],
    qualityScores: [
      { code: 'insufficient', labelEn: 'Insufficient', labelAr: 'غير كافٍ', minScore: 0, maxScore: 20 },
      { code: 'partial', labelEn: 'Partial', labelAr: 'جزئي', minScore: 21, maxScore: 40 },
      { code: 'adequate', labelEn: 'Adequate', labelAr: 'كافٍ', minScore: 41, maxScore: 60 },
      { code: 'strong', labelEn: 'Strong', labelAr: 'قوي', minScore: 61, maxScore: 80 },
      { code: 'conclusive', labelEn: 'Conclusive', labelAr: 'قاطع', minScore: 81, maxScore: 100 },
    ],
  };
}

export async function seedEvidenceModule(tenantId: string, schema: string): Promise<void> {
  const data = getEvidenceSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['evidence', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
