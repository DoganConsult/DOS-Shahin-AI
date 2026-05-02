import { QIYAS_LIMITS, QIYAS_TIMEOUTS, QIYAS_BUSINESS_THRESHOLDS } from './qiyas-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface MaturityModelSeed {
  code: string;
  nameEn: string;
  nameAr: string;
  domains: Array<{ code: string; nameEn: string; nameAr: string; weight: number }>;
  levels: number;
}

export interface QiyasSeedData {
  defaultConfigs: Record<string, unknown>;
  maturityModels: MaturityModelSeed[];
  assessmentTypes: Array<{ code: string; labelEn: string; labelAr: string }>;
  maturityLevels: Array<{ level: number; labelEn: string; labelAr: string; description: string }>;
  scoringMethods: Array<{ code: string; labelEn: string; labelAr: string }>;
  qiyasStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getQiyasSeedData(): QiyasSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'qiyas',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: QIYAS_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxQuestionsPerAssessment: QIYAS_LIMITS.MAX_QUESTIONS_PER_ASSESSMENT,
      targetMaturityDefault: QIYAS_BUSINESS_THRESHOLDS.TARGET_MATURITY_DEFAULT,
      minResponseRate: QIYAS_BUSINESS_THRESHOLDS.MIN_RESPONSE_RATE,
      benchmarkMinRespondents: QIYAS_BUSINESS_THRESHOLDS.BENCHMARK_MIN_RESPONDENTS,
      assessmentTimeoutHours: QIYAS_TIMEOUTS.ASSESSMENT_TIMEOUT_HOURS,
      maxExportRows: QIYAS_LIMITS.MAX_EXPORT_ROWS,
    },
    maturityModels: [
      {
        code: 'nca_ecc', nameEn: 'NCA-ECC Maturity Model', nameAr: 'نموذج نضج ضوابط الأمن السيبراني',
        levels: 5,
        domains: [
          { code: 'governance', nameEn: 'Cybersecurity Governance', nameAr: 'حوكمة الأمن السيبراني', weight: 15 },
          { code: 'defense', nameEn: 'Cybersecurity Defense', nameAr: 'الدفاع السيبراني', weight: 20 },
          { code: 'resilience', nameEn: 'Cybersecurity Resilience', nameAr: 'المرونة السيبرانية', weight: 15 },
          { code: 'third_party', nameEn: 'Third-Party Cybersecurity', nameAr: 'الأمن السيبراني للأطراف الثالثة', weight: 10 },
          { code: 'cloud', nameEn: 'Cloud Computing Cybersecurity', nameAr: 'أمن الحوسبة السحابية', weight: 10 },
          { code: 'ics', nameEn: 'ICS Cybersecurity', nameAr: 'أمن أنظمة التحكم الصناعي', weight: 10 },
          { code: 'data', nameEn: 'Data Management', nameAr: 'إدارة البيانات', weight: 10 },
          { code: 'identity', nameEn: 'Identity & Access Management', nameAr: 'إدارة الهوية والوصول', weight: 10 },
        ],
      },
      {
        code: 'iso27001', nameEn: 'ISO 27001 Maturity', nameAr: 'نضج آيزو 27001',
        levels: 5,
        domains: [
          { code: 'context', nameEn: 'Context of the Organization', nameAr: 'سياق المنظمة', weight: 10 },
          { code: 'leadership', nameEn: 'Leadership', nameAr: 'القيادة', weight: 15 },
          { code: 'planning', nameEn: 'Planning', nameAr: 'التخطيط', weight: 15 },
          { code: 'support', nameEn: 'Support', nameAr: 'الدعم', weight: 10 },
          { code: 'operation', nameEn: 'Operation', nameAr: 'التشغيل', weight: 20 },
          { code: 'evaluation', nameEn: 'Performance Evaluation', nameAr: 'تقييم الأداء', weight: 15 },
          { code: 'improvement', nameEn: 'Improvement', nameAr: 'التحسين', weight: 15 },
        ],
      },
      {
        code: 'grc_general', nameEn: 'GRC General Maturity', nameAr: 'نضج الحوكمة والمخاطر والامتثال',
        levels: 5,
        domains: [
          { code: 'governance', nameEn: 'Governance', nameAr: 'الحوكمة', weight: 25 },
          { code: 'risk', nameEn: 'Risk Management', nameAr: 'إدارة المخاطر', weight: 25 },
          { code: 'compliance', nameEn: 'Compliance', nameAr: 'الامتثال', weight: 25 },
          { code: 'culture', nameEn: 'Security Culture', nameAr: 'ثقافة الأمن', weight: 25 },
        ],
      },
    ],
    assessmentTypes: [
      { code: 'self_assessment', labelEn: 'Self-Assessment', labelAr: 'تقييم ذاتي' },
      { code: 'external_audit', labelEn: 'External Audit', labelAr: 'تدقيق خارجي' },
      { code: 'gap_analysis', labelEn: 'Gap Analysis', labelAr: 'تحليل الفجوات' },
      { code: 'benchmark', labelEn: 'Benchmarking', labelAr: 'قياس مرجعي' },
      { code: 'continuous', labelEn: 'Continuous Assessment', labelAr: 'تقييم مستمر' },
    ],
    maturityLevels: [
      { level: 1, labelEn: 'Initial', labelAr: 'أولي', description: 'Ad-hoc, reactive' },
      { level: 2, labelEn: 'Developing', labelAr: 'متطور', description: 'Repeatable but informal' },
      { level: 3, labelEn: 'Defined', labelAr: 'محدد', description: 'Documented and standardized' },
      { level: 4, labelEn: 'Managed', labelAr: 'مُدار', description: 'Measured and controlled' },
      { level: 5, labelEn: 'Optimizing', labelAr: 'محسّن', description: 'Continuous improvement' },
    ],
    scoringMethods: [
      { code: 'weighted_average', labelEn: 'Weighted Average', labelAr: 'المتوسط المرجح' },
      { code: 'simple_average', labelEn: 'Simple Average', labelAr: 'المتوسط البسيط' },
      { code: 'lowest_domain', labelEn: 'Lowest Domain Score', labelAr: 'أدنى نطاق' },
    ],
    qiyasStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ', terminal: false },
      { code: 'completed', labelEn: 'Completed', labelAr: 'مكتمل', terminal: false },
      { code: 'reviewed', labelEn: 'Reviewed', labelAr: 'تمت المراجعة', terminal: false },
      { code: 'published', labelEn: 'Published', labelAr: 'منشور', terminal: false },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
  };
}

export async function seedQiyasModule(tenantId: string, schema: string): Promise<void> {
  const data = getQiyasSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['qiyas', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
