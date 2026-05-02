import { TRAINING_LIMITS, TRAINING_TIMEOUTS, TRAINING_BUSINESS_THRESHOLDS } from './training-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface TrainingSeedData {
  defaultConfigs: Record<string, unknown>;
  trainingCategories: Array<{ code: string; labelEn: string; labelAr: string }>;
  deliveryMethods: Array<{ code: string; labelEn: string; labelAr: string }>;
  trainingStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getTrainingSeedData(): TrainingSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'training',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: TRAINING_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxEnrollmentPerCourse: TRAINING_LIMITS.MAX_ENROLLMENT_PER_COURSE,
      maxAttempts: TRAINING_LIMITS.MAX_ATTEMPTS,
      passingScoreMin: TRAINING_BUSINESS_THRESHOLDS.PASSING_SCORE_MIN,
      certificationWarningDays: TRAINING_TIMEOUTS.CERTIFICATION_WARNING_DAYS,
      recertificationGraceDays: TRAINING_BUSINESS_THRESHOLDS.RECERTIFICATION_GRACE_DAYS,
      maxExportRows: TRAINING_LIMITS.MAX_EXPORT_ROWS,
    },
    trainingCategories: [
      { code: 'security_awareness', labelEn: 'Security Awareness', labelAr: 'التوعية الأمنية' },
      { code: 'compliance', labelEn: 'Compliance', labelAr: 'الامتثال' },
      { code: 'privacy', labelEn: 'Privacy', labelAr: 'الخصوصية' },
      { code: 'incident_response', labelEn: 'Incident Response', labelAr: 'الاستجابة للحوادث' },
      { code: 'risk_management', labelEn: 'Risk Management', labelAr: 'إدارة المخاطر' },
      { code: 'phishing', labelEn: 'Phishing Awareness', labelAr: 'التوعية بالتصيد' },
      { code: 'data_protection', labelEn: 'Data Protection', labelAr: 'حماية البيانات' },
      { code: 'nca_ecc', labelEn: 'NCA-ECC Compliance', labelAr: 'امتثال الضوابط الأساسية' },
      { code: 'general', labelEn: 'General', labelAr: 'عام' },
    ],
    deliveryMethods: [
      { code: 'e_learning', labelEn: 'E-Learning', labelAr: 'تعليم إلكتروني' },
      { code: 'instructor_led', labelEn: 'Instructor-Led', labelAr: 'بقيادة مدرب' },
      { code: 'blended', labelEn: 'Blended', labelAr: 'مدمج' },
      { code: 'self_paced', labelEn: 'Self-Paced', labelAr: 'ذاتي' },
      { code: 'virtual_classroom', labelEn: 'Virtual Classroom', labelAr: 'فصل افتراضي' },
    ],
    trainingStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'published', labelEn: 'Published', labelAr: 'منشور', terminal: false },
      { code: 'enrollment_open', labelEn: 'Enrollment Open', labelAr: 'التسجيل مفتوح', terminal: false },
      { code: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ', terminal: false },
      { code: 'completed', labelEn: 'Completed', labelAr: 'مكتمل', terminal: false },
      { code: 'expired', labelEn: 'Expired', labelAr: 'منتهي الصلاحية', terminal: true },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
  };
}

export async function seedTrainingModule(tenantId: string, schema: string): Promise<void> {
  const data = getTrainingSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['training', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
