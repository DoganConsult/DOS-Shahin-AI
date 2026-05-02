import { catchHandler, EC } from '@dos/platform-core/resilience';
import {
  COMPLIANCE_LIMITS,
  COMPLIANCE_TIMEOUTS,
  COMPLIANCE_SLA_DEFAULTS,
} from './compliance-constants';

/**
 * Design-token color references for seed data.
 * Maps semantic meaning to CSS custom property names from grc-tokens.css.
 * At seed time these are stored as token references; the frontend resolves them at render.
 */
const SEED_COLORS = {
  // Compliance levels
  compliant:                'var(--success)',
  substantially_compliant:  'var(--severity-low)',
  partially_compliant:      'var(--severity-medium)',
  non_compliant:            'var(--severity-critical)',
  // Gap severities
  critical:                 'var(--severity-critical)',
  major:                    'var(--severity-high)',
  minor:                    'var(--severity-medium)',
  observation:              'var(--primary)',
} as const;

export interface ComplianceSeedData {
  defaultConfigs: Record<string, unknown>;
  complianceFrameworks: Array<{
    code: string;
    nameEn: string;
    nameAr: string;
    regulatoryBody: string;
    regulatoryBodyAr: string;
    region: string;
    version: string;
    mandatory: boolean;
  }>;
  complianceLevels: Array<{
    code: string;
    labelEn: string;
    labelAr: string;
    minScore: number;
    maxScore: number;
    color: string;
  }>;
  assessmentTypes: Array<{
    code: string;
    labelEn: string;
    labelAr: string;
    requiresExternalAuditor: boolean;
  }>;
  regulatoryBodies: Array<{
    code: string;
    nameEn: string;
    nameAr: string;
    country: string;
    frameworks: string[];
  }>;
  gapSeverityLevels: Array<{
    code: string;
    labelEn: string;
    labelAr: string;
    remediationSlaHours: number;
    color: string;
  }>;
  controlMaturityLevels: Array<{
    code: string;
    labelEn: string;
    labelAr: string;
    order: number;
  }>;
  programStatuses: Array<{
    code: string;
    labelEn: string;
    labelAr: string;
    terminal: boolean;
  }>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  /** Module-level permission codes surfaced in health/config endpoints */
  permissions: Array<{ code: string; description: string }>;
  /** Module-level role codes */
  roles: Array<{ code: string; nameEn: string }>;
  /** Module-level action codes */
  actions: Array<{ code: string; nameEn: string }>;
}

export function getComplianceSeedData(): ComplianceSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'compliance',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: COMPLIANCE_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxControlsPerFramework: COMPLIANCE_LIMITS.MAX_CONTROLS_PER_FRAMEWORK,
      maxExportRows: COMPLIANCE_LIMITS.MAX_EXPORT_ROWS,
      slaDefaults: COMPLIANCE_SLA_DEFAULTS,
      certificationExpiryWarningDays: 30,
      regulatoryChangeCheckEnabled: true,
      assessmentCycleDefaultDays: COMPLIANCE_TIMEOUTS.DEFAULT_ASSESSMENT_CYCLE_DAYS,
    },
    complianceFrameworks: [
      {
        code: 'nca_ecc',
        nameEn: 'NCA Essential Cybersecurity Controls (ECC)',
        nameAr: 'الضوابط الأساسية للأمن السيبراني - الهيئة الوطنية للأمن السيبراني',
        regulatoryBody: 'NCA',
        regulatoryBodyAr: 'الهيئة الوطنية للأمن السيبراني',
        region: 'SA',
        version: '1.0',
        mandatory: true,
      },
      {
        code: 'nca_cscc',
        nameEn: 'NCA Cloud Cybersecurity Controls (CSCC)',
        nameAr: 'ضوابط الأمن السيبراني للحوسبة السحابية',
        regulatoryBody: 'NCA',
        regulatoryBodyAr: 'الهيئة الوطنية للأمن السيبراني',
        region: 'SA',
        version: '1.0',
        mandatory: false,
      },
      {
        code: 'nca_otcc',
        nameEn: 'NCA Operational Technology Cybersecurity Controls (OTCC)',
        nameAr: 'ضوابط الأمن السيبراني للتقنية التشغيلية',
        regulatoryBody: 'NCA',
        regulatoryBodyAr: 'الهيئة الوطنية للأمن السيبراني',
        region: 'SA',
        version: '1.0',
        mandatory: false,
      },
      {
        code: 'sama_csfp',
        nameEn: 'SAMA Cybersecurity Framework (CSFP)',
        nameAr: 'إطار الأمن السيبراني لمؤسسة النقد العربي السعودي',
        regulatoryBody: 'SAMA',
        regulatoryBodyAr: 'مؤسسة النقد العربي السعودي',
        region: 'SA',
        version: '1.0',
        mandatory: true,
      },
      {
        code: 'iso27001',
        nameEn: 'ISO/IEC 27001 Information Security Management',
        nameAr: 'معيار إدارة أمن المعلومات أيزو 27001',
        regulatoryBody: 'ISO',
        regulatoryBodyAr: 'المنظمة الدولية للمعايير',
        region: 'GLOBAL',
        version: '2022',
        mandatory: false,
      },
      {
        code: 'iso27701',
        nameEn: 'ISO/IEC 27701 Privacy Information Management',
        nameAr: 'معيار إدارة معلومات الخصوصية أيزو 27701',
        regulatoryBody: 'ISO',
        regulatoryBodyAr: 'المنظمة الدولية للمعايير',
        region: 'GLOBAL',
        version: '2019',
        mandatory: false,
      },
      {
        code: 'nist_csf',
        nameEn: 'NIST Cybersecurity Framework (CSF)',
        nameAr: 'إطار الأمن السيبراني للمعهد الوطني للمعايير والتقنية',
        regulatoryBody: 'NIST',
        regulatoryBodyAr: 'المعهد الوطني للمعايير والتقنية',
        region: 'GLOBAL',
        version: '2.0',
        mandatory: false,
      },
      {
        code: 'pci_dss',
        nameEn: 'PCI DSS Payment Card Industry Data Security Standard',
        nameAr: 'معيار أمن بيانات صناعة بطاقات الدفع',
        regulatoryBody: 'PCI SSC',
        regulatoryBodyAr: 'مجلس معايير أمن PCI',
        region: 'GLOBAL',
        version: '4.0',
        mandatory: false,
      },
      {
        code: 'gdpr',
        nameEn: 'General Data Protection Regulation (GDPR)',
        nameAr: 'اللائحة العامة لحماية البيانات',
        regulatoryBody: 'EU',
        regulatoryBodyAr: 'الاتحاد الأوروبي',
        region: 'EU',
        version: '2018',
        mandatory: false,
      },
      {
        code: 'pdpl',
        nameEn: 'Personal Data Protection Law (PDPL)',
        nameAr: 'نظام حماية البيانات الشخصية',
        regulatoryBody: 'SDAIA',
        regulatoryBodyAr: 'الهيئة السعودية للبيانات والذكاء الاصطناعي',
        region: 'SA',
        version: '2021',
        mandatory: true,
      },
      {
        code: 'isa_ccc',
        nameEn: 'ISA/IEC 62443 Industrial Cybersecurity',
        nameAr: 'معيار الأمن السيبراني الصناعي ISA/IEC 62443',
        regulatoryBody: 'ISA',
        regulatoryBodyAr: 'جمعية الأتمتة الدولية',
        region: 'GLOBAL',
        version: '2018',
        mandatory: false,
      },
      {
        code: 'cobit',
        nameEn: 'COBIT 2019 IT Governance Framework',
        nameAr: 'إطار حوكمة تكنولوجيا المعلومات COBIT 2019',
        regulatoryBody: 'ISACA',
        regulatoryBodyAr: 'جمعية مراجعة وضبط نظم المعلومات',
        region: 'GLOBAL',
        version: '2019',
        mandatory: false,
      },
    ],
    complianceLevels: [
      { code: 'compliant', labelEn: 'Compliant', labelAr: 'ملتزم', minScore: 90, maxScore: 100, color: SEED_COLORS.compliant },
      { code: 'substantially_compliant', labelEn: 'Substantially Compliant', labelAr: 'ملتزم جوهريًا', minScore: 75, maxScore: 89, color: SEED_COLORS.substantially_compliant },
      { code: 'partially_compliant', labelEn: 'Partially Compliant', labelAr: 'ملتزم جزئيًا', minScore: 50, maxScore: 74, color: SEED_COLORS.partially_compliant },
      { code: 'non_compliant', labelEn: 'Non-Compliant', labelAr: 'غير ملتزم', minScore: 0, maxScore: 49, color: SEED_COLORS.non_compliant },
    ],
    assessmentTypes: [
      { code: 'self_assessment', labelEn: 'Self-Assessment', labelAr: 'التقييم الذاتي', requiresExternalAuditor: false },
      { code: 'internal_audit', labelEn: 'Internal Audit', labelAr: 'مراجعة داخلية', requiresExternalAuditor: false },
      { code: 'external_audit', labelEn: 'External Audit', labelAr: 'مراجعة خارجية', requiresExternalAuditor: true },
      { code: 'regulatory', labelEn: 'Regulatory Assessment', labelAr: 'تقييم تنظيمي', requiresExternalAuditor: true },
      { code: 'third_party', labelEn: 'Third-Party Assessment', labelAr: 'تقييم طرف ثالث', requiresExternalAuditor: true },
    ],
    regulatoryBodies: [
      {
        code: 'NCA',
        nameEn: 'National Cybersecurity Authority',
        nameAr: 'الهيئة الوطنية للأمن السيبراني',
        country: 'SA',
        frameworks: ['nca_ecc', 'nca_cscc', 'nca_otcc'],
      },
      {
        code: 'SAMA',
        nameEn: 'Saudi Central Bank (SAMA)',
        nameAr: 'مؤسسة النقد العربي السعودي',
        country: 'SA',
        frameworks: ['sama_csfp'],
      },
      {
        code: 'SDAIA',
        nameEn: 'Saudi Data & AI Authority',
        nameAr: 'الهيئة السعودية للبيانات والذكاء الاصطناعي',
        country: 'SA',
        frameworks: ['pdpl'],
      },
      {
        code: 'CITC',
        nameEn: 'Communications, Space & Technology Commission',
        nameAr: 'هيئة الاتصالات والفضاء والتقنية',
        country: 'SA',
        frameworks: [],
      },
      {
        code: 'ISO',
        nameEn: 'International Organization for Standardization',
        nameAr: 'المنظمة الدولية للمعايير',
        country: 'GLOBAL',
        frameworks: ['iso27001', 'iso27701'],
      },
      {
        code: 'NIST',
        nameEn: 'National Institute of Standards and Technology',
        nameAr: 'المعهد الوطني للمعايير والتقنية',
        country: 'US',
        frameworks: ['nist_csf'],
      },
      {
        code: 'EU',
        nameEn: 'European Union',
        nameAr: 'الاتحاد الأوروبي',
        country: 'EU',
        frameworks: ['gdpr'],
      },
    ],
    gapSeverityLevels: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', remediationSlaHours: COMPLIANCE_SLA_DEFAULTS.critical, color: SEED_COLORS.critical },
      { code: 'major', labelEn: 'Major', labelAr: 'رئيسي', remediationSlaHours: COMPLIANCE_SLA_DEFAULTS.high, color: SEED_COLORS.major },
      { code: 'minor', labelEn: 'Minor', labelAr: 'ثانوي', remediationSlaHours: COMPLIANCE_SLA_DEFAULTS.medium, color: SEED_COLORS.minor },
      { code: 'observation', labelEn: 'Observation', labelAr: 'ملاحظة', remediationSlaHours: COMPLIANCE_SLA_DEFAULTS.low, color: SEED_COLORS.observation },
    ],
    controlMaturityLevels: [
      { code: 'initial', labelEn: 'Initial', labelAr: 'ابتدائي', order: 1 },
      { code: 'developing', labelEn: 'Developing', labelAr: 'نامٍ', order: 2 },
      { code: 'defined', labelEn: 'Defined', labelAr: 'محدد', order: 3 },
      { code: 'managed', labelEn: 'Managed', labelAr: 'مُدار', order: 4 },
      { code: 'optimized', labelEn: 'Optimized', labelAr: 'محسَّن', order: 5 },
    ],
    programStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false },
      { code: 'assessment_in_progress', labelEn: 'Assessment In Progress', labelAr: 'التقييم جارٍ', terminal: false },
      { code: 'compliant', labelEn: 'Compliant', labelAr: 'ملتزم', terminal: false },
      { code: 'partially_compliant', labelEn: 'Partially Compliant', labelAr: 'ملتزم جزئيًا', terminal: false },
      { code: 'non_compliant', labelEn: 'Non-Compliant', labelAr: 'غير ملتزم', terminal: false },
      { code: 'remediation', labelEn: 'Remediation', labelAr: 'في مرحلة المعالجة', terminal: false },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
    defaultTemplates: [
      {
        code: 'compliance_nca_ecc',
        nameEn: 'NCA ECC Compliance Program Template',
        nameAr: 'قالب برنامج الامتثال للضوابط الأساسية للأمن السيبراني',
        data: { version: 1, frameworkCode: 'nca_ecc', fields: [], layout: 'standard' },
      },
      {
        code: 'compliance_iso27001',
        nameEn: 'ISO 27001 Compliance Program Template',
        nameAr: 'قالب برنامج الامتثال لمعيار أيزو 27001',
        data: { version: 1, frameworkCode: 'iso27001', fields: [], layout: 'standard' },
      },
      {
        code: 'compliance_default',
        nameEn: 'Default Compliance Program Template',
        nameAr: 'قالب برنامج الامتثال الافتراضي',
        data: { version: 1, fields: [], layout: 'standard' },
      },
    ],
    permissions: [
      { code: 'compliance.program.read', description: 'Read compliance programs' },
      { code: 'compliance.program.write', description: 'Create/update compliance programs' },
      { code: 'compliance.program.delete', description: 'Delete compliance programs' },
      { code: 'compliance.program.configure', description: 'Configure compliance module' },
    ],
    roles: [
      { code: 'compliance_admin', nameEn: 'Compliance Admin' },
      { code: 'compliance_officer', nameEn: 'Compliance Officer' },
      { code: 'compliance_viewer', nameEn: 'Compliance Viewer' },
    ],
    actions: [
      { code: 'compliance.assess', nameEn: 'Assess' },
      { code: 'compliance.certify', nameEn: 'Certify' },
      { code: 'compliance.remediate', nameEn: 'Remediate' },
    ],
  };
}

export async function seedComplianceModule(tenantId: string, schema: string): Promise<void> {
  const data = getComplianceSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['compliance', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
