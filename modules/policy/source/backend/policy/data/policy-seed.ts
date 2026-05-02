import { catchHandler, EC } from '@dos/platform-core/resilience';
import {
  POLICY_LIMITS,
  POLICY_TIMEOUTS,
  POLICY_REVIEW_CYCLE_DEFAULTS,
  POLICY_FRAMEWORKS,
  POLICY_ACKNOWLEDGMENT_TYPES,
} from './policy-constants';

export interface PolicySeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  policyTypes: Array<{ code: string; labelEn: string; labelAr: string; defaultReviewCycleDays: number; requiresApprovalLevel: string }>;
  policyCategories: Array<{ code: string; labelEn: string; labelAr: string; defaultReviewCycleDays: number }>;
  policyStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean; requiresReview: boolean }>;
  frameworks: Array<{ code: string; labelEn: string; labelAr: string; region: string; mandatory: boolean }>;
  acknowledgmentTypes: Array<{ code: string; labelEn: string; labelAr: string; requiresEvidence: boolean }>;
  approvalLevels: Array<{ code: string; labelEn: string; labelAr: string; order: number }>;
  reviewCycleDefaults: Record<string, number>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getPolicySeedData(): PolicySeedData {
  return {
    defaultConfigs: {
      moduleCode: 'policy',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: POLICY_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxReviewers: POLICY_LIMITS.MAX_REVIEWERS,
      maxApprovers: POLICY_LIMITS.MAX_APPROVERS,
      defaultReviewCycleDays: POLICY_TIMEOUTS.DEFAULT_REVIEW_CYCLE_DAYS,
      reminderBeforeDays: POLICY_TIMEOUTS.REMINDER_BEFORE_DAYS,
      acknowledgmentDeadlineDays: POLICY_TIMEOUTS.ACKNOWLEDGMENT_DEADLINE_DAYS,
      maxExportRows: POLICY_LIMITS.MAX_EXPORT_ROWS,
      reviewCycleDefaults: POLICY_REVIEW_CYCLE_DEFAULTS,
      frameworksEnabled: true,
      versionControlEnabled: true,
      exceptionManagementEnabled: true,
    },
    defaultTemplates: [
      {
        code: 'policy_default',
        nameEn: 'Default Policy Template',
        nameAr: 'قالب السياسة الافتراضي',
        data: { version: 1, fields: [], layout: 'standard', sections: ['purpose', 'scope', 'policy_statement', 'roles', 'compliance', 'review'] },
      },
      {
        code: 'security_policy',
        nameEn: 'Information Security Policy Template',
        nameAr: 'قالب سياسة أمن المعلومات',
        data: { version: 1, fields: [], layout: 'security', sections: ['purpose', 'scope', 'risk_context', 'policy_statement', 'controls', 'roles', 'exceptions', 'compliance', 'review'] },
      },
      {
        code: 'procedure_template',
        nameEn: 'Standard Operating Procedure Template',
        nameAr: 'قالب إجراءات التشغيل الموحدة',
        data: { version: 1, fields: [], layout: 'procedure', sections: ['purpose', 'scope', 'prerequisites', 'steps', 'roles', 'escalation', 'review'] },
      },
    ],
    policyTypes: [
      { code: 'policy', labelEn: 'Policy', labelAr: 'سياسة', defaultReviewCycleDays: 365, requiresApprovalLevel: 'director' },
      { code: 'standard', labelEn: 'Standard', labelAr: 'معيار', defaultReviewCycleDays: 365, requiresApprovalLevel: 'manager' },
      { code: 'procedure', labelEn: 'Procedure', labelAr: 'إجراء', defaultReviewCycleDays: 365, requiresApprovalLevel: 'manager' },
      { code: 'guideline', labelEn: 'Guideline', labelAr: 'مبدأ توجيهي', defaultReviewCycleDays: 730, requiresApprovalLevel: 'manager' },
      { code: 'baseline', labelEn: 'Baseline', labelAr: 'خط الأساس', defaultReviewCycleDays: 365, requiresApprovalLevel: 'director' },
      { code: 'charter', labelEn: 'Charter', labelAr: 'ميثاق', defaultReviewCycleDays: 730, requiresApprovalLevel: 'vp' },
      { code: 'framework', labelEn: 'Framework', labelAr: 'إطار عمل', defaultReviewCycleDays: 730, requiresApprovalLevel: 'ciso' },
    ],
    policyCategories: [
      { code: 'information_security', labelEn: 'Information Security', labelAr: 'أمن المعلومات', defaultReviewCycleDays: 365 },
      { code: 'acceptable_use', labelEn: 'Acceptable Use', labelAr: 'الاستخدام المقبول', defaultReviewCycleDays: 365 },
      { code: 'access_control', labelEn: 'Access Control', labelAr: 'التحكم في الوصول', defaultReviewCycleDays: 365 },
      { code: 'data_classification', labelEn: 'Data Classification', labelAr: 'تصنيف البيانات', defaultReviewCycleDays: 365 },
      { code: 'incident_response', labelEn: 'Incident Response', labelAr: 'الاستجابة للحوادث', defaultReviewCycleDays: 180 },
      { code: 'bcp', labelEn: 'Business Continuity', labelAr: 'استمرارية الأعمال', defaultReviewCycleDays: 365 },
      { code: 'privacy', labelEn: 'Privacy & Data Protection', labelAr: 'الخصوصية وحماية البيانات', defaultReviewCycleDays: 365 },
      { code: 'hr', labelEn: 'Human Resources', labelAr: 'الموارد البشرية', defaultReviewCycleDays: 730 },
      { code: 'finance', labelEn: 'Finance & Accounting', labelAr: 'المالية والمحاسبة', defaultReviewCycleDays: 365 },
      { code: 'operations', labelEn: 'Operations', labelAr: 'العمليات', defaultReviewCycleDays: 365 },
      { code: 'technology', labelEn: 'Technology', labelAr: 'التقنية', defaultReviewCycleDays: 365 },
      { code: 'compliance', labelEn: 'Compliance & Regulatory', labelAr: 'الامتثال والتنظيم', defaultReviewCycleDays: 365 },
      { code: 'risk', labelEn: 'Risk Management', labelAr: 'إدارة المخاطر', defaultReviewCycleDays: 365 },
    ],
    policyStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false, requiresReview: false },
      { code: 'submitted', labelEn: 'Submitted', labelAr: 'مقدّم', terminal: false, requiresReview: false },
      { code: 'under_review', labelEn: 'Under Review', labelAr: 'قيد المراجعة', terminal: false, requiresReview: true },
      { code: 'revision_requested', labelEn: 'Revision Requested', labelAr: 'طلب مراجعة', terminal: false, requiresReview: true },
      { code: 'resubmitted', labelEn: 'Resubmitted', labelAr: 'أعيد تقديمه', terminal: false, requiresReview: false },
      { code: 'approved', labelEn: 'Approved', labelAr: 'معتمد', terminal: false, requiresReview: false },
      { code: 'published', labelEn: 'Published', labelAr: 'منشور', terminal: false, requiresReview: false },
      { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false, requiresReview: false },
      { code: 'review_due', labelEn: 'Review Due', labelAr: 'مستحق المراجعة', terminal: false, requiresReview: true },
      { code: 'under_revision', labelEn: 'Under Revision', labelAr: 'قيد المراجعة والتعديل', terminal: false, requiresReview: true },
      { code: 'retired', labelEn: 'Retired', labelAr: 'متقاعد', terminal: true, requiresReview: false },
      { code: 'review', labelEn: 'Review', labelAr: 'مراجعة', terminal: false, requiresReview: true },
      { code: 'in_review', labelEn: 'In Review', labelAr: 'قيد المراجعة', terminal: false, requiresReview: true },
      { code: 'effective', labelEn: 'Effective', labelAr: 'ساري المفعول', terminal: false, requiresReview: false },
      { code: 'deprecated', labelEn: 'Deprecated', labelAr: 'متقادم', terminal: true, requiresReview: false },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true, requiresReview: false },
    ],
    frameworks: [
      { code: 'NCA-ECC', labelEn: 'NCA Essential Cybersecurity Controls', labelAr: 'ضوابط الأمن السيبراني الأساسية للهيئة', region: 'SA', mandatory: true },
      { code: 'NCA-CSCC', labelEn: 'NCA Cloud Security Controls', labelAr: 'ضوابط أمن الحوسبة السحابية', region: 'SA', mandatory: false },
      { code: 'ISO-27001', labelEn: 'ISO/IEC 27001 Information Security', labelAr: 'أيزو 27001 أمن المعلومات', region: 'global', mandatory: false },
      { code: 'ISO-27701', labelEn: 'ISO/IEC 27701 Privacy Management', labelAr: 'أيزو 27701 إدارة الخصوصية', region: 'global', mandatory: false },
      { code: 'NIST-CSF', labelEn: 'NIST Cybersecurity Framework', labelAr: 'إطار الأمن السيبراني NIST', region: 'global', mandatory: false },
      { code: 'NIST-800-53', labelEn: 'NIST SP 800-53 Security Controls', labelAr: 'ضوابط الأمن NIST 800-53', region: 'global', mandatory: false },
      { code: 'SAMA-CSF', labelEn: 'SAMA Cyber Security Framework', labelAr: 'إطار الأمن السيبراني لمؤسسة النقد', region: 'SA', mandatory: false },
      { code: 'PCI-DSS', labelEn: 'PCI Data Security Standard', labelAr: 'معيار أمان بيانات PCI', region: 'global', mandatory: false },
      { code: 'GDPR', labelEn: 'General Data Protection Regulation', labelAr: 'اللائحة العامة لحماية البيانات', region: 'EU', mandatory: false },
      { code: 'PDPL', labelEn: 'Personal Data Protection Law (KSA)', labelAr: 'نظام حماية البيانات الشخصية', region: 'SA', mandatory: true },
      { code: 'COBIT', labelEn: 'COBIT IT Governance Framework', labelAr: 'إطار حوكمة تقنية المعلومات COBIT', region: 'global', mandatory: false },
      { code: 'ITIL', labelEn: 'ITIL Service Management', labelAr: 'إدارة الخدمات ITIL', region: 'global', mandatory: false },
    ],
    acknowledgmentTypes: [
      { code: 'read_and_understood', labelEn: 'Read and Understood', labelAr: 'قرأت وفهمت', requiresEvidence: false },
      { code: 'training_completed', labelEn: 'Training Completed', labelAr: 'اكتملت التدريب', requiresEvidence: true },
      { code: 'attestation', labelEn: 'Formal Attestation', labelAr: 'شهادة رسمية', requiresEvidence: true },
      { code: 'e_signature', labelEn: 'Electronic Signature', labelAr: 'توقيع إلكتروني', requiresEvidence: true },
      { code: 'manager_confirmed', labelEn: 'Manager Confirmed', labelAr: 'تأكيد المدير', requiresEvidence: false },
    ],
    approvalLevels: [
      { code: 'manager', labelEn: 'Manager', labelAr: 'مدير', order: 1 },
      { code: 'director', labelEn: 'Director', labelAr: 'مدير عام', order: 2 },
      { code: 'vp', labelEn: 'Vice President', labelAr: 'نائب الرئيس', order: 3 },
      { code: 'ciso', labelEn: 'CISO', labelAr: 'مسؤول أمن المعلومات', order: 4 },
      { code: 'board', labelEn: 'Board of Directors', labelAr: 'مجلس الإدارة', order: 5 },
    ],
    reviewCycleDefaults: POLICY_REVIEW_CYCLE_DEFAULTS,
  };
}

export async function seedPolicyModule(tenantId: string, schema: string): Promise<void> {
  const data = getPolicySeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['policy', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}

export const POLICY_FRAMEWORK_CODES = POLICY_FRAMEWORKS;
export const POLICY_ACKNOWLEDGMENT_TYPE_CODES = POLICY_ACKNOWLEDGMENT_TYPES;
