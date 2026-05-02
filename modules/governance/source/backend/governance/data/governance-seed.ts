import { catchHandler, EC } from '@dos/platform-core/resilience';
import {
  GOVERNANCE_LIMITS,
  GOVERNANCE_TIMEOUTS,
  GOVERNANCE_SLA_DEFAULTS,
  GOVERNANCE_BODY_TYPES as _GOVERNANCE_BODY_TYPES,
  GOVERNANCE_MEETING_FREQUENCIES as _GOVERNANCE_MEETING_FREQUENCIES,
  GOVERNANCE_DECISION_TYPES as _GOVERNANCE_DECISION_TYPES,
} from './governance-constants';

export interface GovernanceSeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  frameworkTypes: Array<{ code: string; nameEn: string; nameAr: string; description: string; standardBody: string; version: string }>;
  maturityLevels: Array<{ level: number; code: string; nameEn: string; nameAr: string; description: string; scoreMin: number; scoreMax: number }>;
  controlCategories: Array<{ code: string; nameEn: string; nameAr: string; description: string }>;
  assessmentTypes: Array<{ code: string; nameEn: string; nameAr: string; frequency: string; requiresEvidence: boolean }>;
  implementationStatuses: Array<{ code: string; nameEn: string; nameAr: string; terminal: boolean; coverageWeight: number }>;
  frameworkStatuses: Array<{ code: string; nameEn: string; nameAr: string; terminal: boolean }>;
  /** Module-level permission codes surfaced in health/config endpoints */
  permissions: Array<{ code: string; description: string }>;
  /** Module-level role codes */
  roles: Array<{ code: string; nameEn: string }>;
  /** Module-level action codes */
  actions: Array<{ code: string; nameEn: string }>;
}

export function getGovernanceSeedData(): GovernanceSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'governance',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: GOVERNANCE_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxExportRows: GOVERNANCE_LIMITS.MAX_EXPORT_ROWS,
      maxLinkedEntities: GOVERNANCE_LIMITS.MAX_LINKED_ENTITIES,
      maxCommitteeMembers: GOVERNANCE_LIMITS.MAX_COMMITTEE_MEMBERS,
      slaDefaults: GOVERNANCE_SLA_DEFAULTS,
      escalationAfterHours: GOVERNANCE_TIMEOUTS.ESCALATION_AFTER_HOURS,
      maturityAssessmentIntervalDays: 365,
      boardReportFrequency: 'quarterly',
      controlCoverageWarningThreshold: 80,
      controlCoverageCriticalThreshold: 60,
      minMaturityScoreForActive: 2.0,
    },
    frameworkTypes: [
      {
        code: 'nca_ecc',
        nameEn: 'NCA Essential Cybersecurity Controls',
        nameAr: 'الضوابط الأساسية للأمن السيبراني (هيئة الأمن السيبراني)',
        description: 'Saudi National Cybersecurity Authority Essential Controls framework for critical national infrastructure',
        standardBody: 'National Cybersecurity Authority (NCA)',
        version: '1.0',
      },
      {
        code: 'iso27001',
        nameEn: 'ISO/IEC 27001 Information Security Management',
        nameAr: 'نظام إدارة أمن المعلومات ISO/IEC 27001',
        description: 'International standard for information security management systems',
        standardBody: 'International Organization for Standardization (ISO)',
        version: '2022',
      },
      {
        code: 'nist_csf',
        nameEn: 'NIST Cybersecurity Framework',
        nameAr: 'إطار الأمن السيبراني NIST',
        description: 'NIST framework for improving critical infrastructure cybersecurity',
        standardBody: 'National Institute of Standards and Technology (NIST)',
        version: '2.0',
      },
      {
        code: 'cobit',
        nameEn: 'COBIT IT Governance Framework',
        nameAr: 'إطار حوكمة تقنية المعلومات COBIT',
        description: 'Framework for IT governance and management best practices',
        standardBody: 'ISACA',
        version: '2019',
      },
      {
        code: 'itil',
        nameEn: 'ITIL IT Service Management',
        nameAr: 'إدارة خدمات تقنية المعلومات ITIL',
        description: 'Best practices framework for IT service management',
        standardBody: 'AXELOS',
        version: '4',
      },
      {
        code: 'sama',
        nameEn: 'SAMA Cyber Security Framework',
        nameAr: 'إطار الأمن السيبراني لمؤسسة النقد العربي السعودي',
        description: 'Saudi Central Bank cybersecurity framework for financial sector',
        standardBody: 'Saudi Central Bank (SAMA)',
        version: '1.0',
      },
      {
        code: 'pdpl',
        nameEn: 'Personal Data Protection Law',
        nameAr: 'نظام حماية البيانات الشخصية',
        description: 'Saudi Arabia Personal Data Protection Law compliance framework',
        standardBody: 'Saudi Data and Artificial Intelligence Authority (SDAIA)',
        version: '2021',
      },
      {
        code: 'cst',
        nameEn: 'Communications and Space Technology Regulatory Framework',
        nameAr: 'إطار هيئة الاتصالات والفضاء والتقنية التنظيمي',
        description: 'CST regulatory framework for telecom and ICT sectors',
        standardBody: 'Communications, Space & Technology Commission (CST)',
        version: '2023',
      },
      {
        code: 'custom',
        nameEn: 'Custom Internal Framework',
        nameAr: 'إطار داخلي مخصص',
        description: 'Organization-specific governance framework',
        standardBody: 'Internal',
        version: '1.0',
      },
    ],
    maturityLevels: [
      {
        level: 1,
        code: 'initial',
        nameEn: 'Initial',
        nameAr: 'مبدئي',
        description: 'Processes are unpredictable, poorly controlled and reactive',
        scoreMin: 1.0,
        scoreMax: 1.9,
      },
      {
        level: 2,
        code: 'managed',
        nameEn: 'Managed',
        nameAr: 'مُدار',
        description: 'Processes are characterized and controlled at the project level',
        scoreMin: 2.0,
        scoreMax: 2.9,
      },
      {
        level: 3,
        code: 'defined',
        nameEn: 'Defined',
        nameAr: 'محدد',
        description: 'Processes are characterized and understood at the organizational level',
        scoreMin: 3.0,
        scoreMax: 3.9,
      },
      {
        level: 4,
        code: 'quantitatively_managed',
        nameEn: 'Quantitatively Managed',
        nameAr: 'مُدار كمياً',
        description: 'Processes are controlled using statistical and quantitative techniques',
        scoreMin: 4.0,
        scoreMax: 4.9,
      },
      {
        level: 5,
        code: 'optimizing',
        nameEn: 'Optimizing',
        nameAr: 'محسَّن',
        description: 'Focus on continual process improvement through incremental and innovative changes',
        scoreMin: 5.0,
        scoreMax: 5.0,
      },
    ],
    controlCategories: [
      { code: 'access_control', nameEn: 'Access Control', nameAr: 'التحكم في الوصول', description: 'Identity, authentication, authorization and privilege management controls' },
      { code: 'asset_management', nameEn: 'Asset Management', nameAr: 'إدارة الأصول', description: 'Inventory, classification and lifecycle of information assets' },
      { code: 'risk_management', nameEn: 'Risk Management', nameAr: 'إدارة المخاطر', description: 'Risk identification, assessment, treatment and monitoring' },
      { code: 'incident_management', nameEn: 'Incident Management', nameAr: 'إدارة الحوادث', description: 'Detection, response and recovery from security incidents' },
      { code: 'business_continuity', nameEn: 'Business Continuity', nameAr: 'استمرارية الأعمال', description: 'Business continuity and disaster recovery planning' },
      { code: 'compliance', nameEn: 'Compliance', nameAr: 'الامتثال', description: 'Legal, regulatory and contractual compliance obligations' },
      { code: 'supply_chain', nameEn: 'Supply Chain Security', nameAr: 'أمن سلسلة الإمداد', description: 'Third-party and supply chain risk management' },
      { code: 'data_protection', nameEn: 'Data Protection', nameAr: 'حماية البيانات', description: 'Data classification, encryption and privacy controls' },
      { code: 'network_security', nameEn: 'Network Security', nameAr: 'أمن الشبكات', description: 'Network architecture, segmentation and monitoring controls' },
      { code: 'physical_security', nameEn: 'Physical Security', nameAr: 'الأمن المادي', description: 'Physical access, environmental and facility controls' },
      { code: 'human_resources', nameEn: 'Human Resources Security', nameAr: 'أمن الموارد البشرية', description: 'Security in employment, training and awareness' },
      { code: 'cryptography', nameEn: 'Cryptography', nameAr: 'التشفير', description: 'Cryptographic controls and key management' },
      { code: 'operations_security', nameEn: 'Operations Security', nameAr: 'أمن العمليات', description: 'Operational procedures, change management and capacity management' },
      { code: 'application_security', nameEn: 'Application Security', nameAr: 'أمن التطبيقات', description: 'Secure development lifecycle and application controls' },
      { code: 'governance', nameEn: 'Governance', nameAr: 'الحوكمة', description: 'Policies, procedures, roles, responsibilities and organizational structure' },
    ],
    assessmentTypes: [
      { code: 'self_assessment', nameEn: 'Self Assessment', nameAr: 'تقييم ذاتي', frequency: 'quarterly', requiresEvidence: false },
      { code: 'internal_audit', nameEn: 'Internal Audit', nameAr: 'تدقيق داخلي', frequency: 'annually', requiresEvidence: true },
      { code: 'external_audit', nameEn: 'External Audit', nameAr: 'تدقيق خارجي', frequency: 'annually', requiresEvidence: true },
      { code: 'gap_analysis', nameEn: 'Gap Analysis', nameAr: 'تحليل الفجوات', frequency: 'semi_annually', requiresEvidence: false },
      { code: 'regulatory_review', nameEn: 'Regulatory Review', nameAr: 'مراجعة تنظيمية', frequency: 'annually', requiresEvidence: true },
      { code: 'penetration_test', nameEn: 'Penetration Testing', nameAr: 'اختبار الاختراق', frequency: 'annually', requiresEvidence: true },
      { code: 'continuous_monitoring', nameEn: 'Continuous Monitoring', nameAr: 'مراقبة مستمرة', frequency: 'monthly', requiresEvidence: false },
    ],
    implementationStatuses: [
      { code: 'not_implemented', nameEn: 'Not Implemented', nameAr: 'غير مُنفَّذ', terminal: false, coverageWeight: 0 },
      { code: 'planned', nameEn: 'Planned', nameAr: 'مخطط', terminal: false, coverageWeight: 0 },
      { code: 'in_progress', nameEn: 'In Progress', nameAr: 'قيد التنفيذ', terminal: false, coverageWeight: 25 },
      { code: 'partially_implemented', nameEn: 'Partially Implemented', nameAr: 'مُنفَّذ جزئياً', terminal: false, coverageWeight: 50 },
      { code: 'implemented', nameEn: 'Implemented', nameAr: 'مُنفَّذ', terminal: false, coverageWeight: 100 },
      { code: 'not_applicable', nameEn: 'Not Applicable', nameAr: 'غير قابل للتطبيق', terminal: true, coverageWeight: 100 },
      { code: 'waived', nameEn: 'Waived', nameAr: 'مُعفى', terminal: true, coverageWeight: 0 },
    ],
    frameworkStatuses: [
      { code: 'draft', nameEn: 'Draft', nameAr: 'مسودة', terminal: false },
      { code: 'under_review', nameEn: 'Under Review', nameAr: 'قيد المراجعة', terminal: false },
      { code: 'approved', nameEn: 'Approved', nameAr: 'معتمد', terminal: false },
      { code: 'active', nameEn: 'Active', nameAr: 'نشط', terminal: false },
      { code: 'deprecated', nameEn: 'Deprecated', nameAr: 'مُهمَل', terminal: true },
      { code: 'archived', nameEn: 'Archived', nameAr: 'مؤرشف', terminal: true },
    ],
    defaultTemplates: [
      {
        code: 'governance_framework_review',
        nameEn: 'Framework Review Template',
        nameAr: 'قالب مراجعة الإطار',
        data: {
          version: 1,
          sections: ['scope', 'objectives', 'controls', 'gaps', 'recommendations', 'action_plan'],
          layout: 'standard',
          requiresApproval: true,
        },
      },
      {
        code: 'governance_maturity_assessment',
        nameEn: 'Maturity Assessment Template',
        nameAr: 'قالب تقييم النضج',
        data: {
          version: 1,
          sections: ['framework_info', 'control_review', 'evidence', 'scoring', 'maturity_level', 'improvement_plan'],
          layout: 'assessment',
          requiresApproval: true,
          requiresEvidence: true,
        },
      },
      {
        code: 'governance_board_report',
        nameEn: 'Board Governance Report Template',
        nameAr: 'قالب تقرير الحوكمة للمجلس',
        data: {
          version: 1,
          sections: ['executive_summary', 'framework_status', 'control_coverage', 'maturity_trends', 'gaps', 'risk_posture', 'recommendations'],
          layout: 'board',
          requiresApproval: true,
          frequency: 'quarterly',
        },
      },
    ],
    permissions: [
      { code: 'governance.record.read', description: 'Read governance records' },
      { code: 'governance.record.write', description: 'Create/update governance records' },
      { code: 'governance.record.delete', description: 'Delete governance records' },
      { code: 'governance.record.configure', description: 'Configure governance module' },
    ],
    roles: [
      { code: 'governance_admin', nameEn: 'Governance Admin' },
      { code: 'governance_officer', nameEn: 'Governance Officer' },
      { code: 'governance_viewer', nameEn: 'Governance Viewer' },
    ],
    actions: [
      { code: 'governance.approve', nameEn: 'Approve' },
      { code: 'governance.review', nameEn: 'Review' },
      { code: 'governance.escalate', nameEn: 'Escalate' },
    ],
  };
}

export async function seedGovernanceModule(tenantId: string, schema: string): Promise<void> {
  const data = getGovernanceSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['governance', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
