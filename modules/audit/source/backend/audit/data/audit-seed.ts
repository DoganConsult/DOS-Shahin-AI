import { catchHandler, EC } from '@dos/platform-core/resilience';
import {
  AUDIT_LIMITS,
  AUDIT_TIMEOUTS,
  AUDIT_SLA_DEFAULTS,
  AUDIT_TYPES as _AUDIT_TYPES,
  AUDIT_FINDING_SEVERITIES as _AUDIT_FINDING_SEVERITIES,
  AUDIT_FINDING_TYPES as _AUDIT_FINDING_TYPES,
  AUDIT_SCOPES,
  AUDIT_OPINION_TYPES as _AUDIT_OPINION_TYPES,
  AUDIT_STATUSES,
  AUDIT_TERMINAL_STATUSES,
} from './audit-constants';

/**
 * Design-token color references for seed data.
 * Maps semantic meaning to CSS custom property names from grc-tokens.css.
 * At seed time these are stored as token references; the frontend resolves them at render.
 */
const SEED_COLORS = {
  critical:      'var(--severity-critical)',
  high:          'var(--severity-high)',
  medium:        'var(--severity-medium)',
  low:           'var(--severity-low)',
  informational: 'var(--text-muted)',
} as const;

export interface AuditSeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  auditTypes: Array<{ code: string; labelEn: string; labelAr: string; defaultDurationDays: number; requiresExternalAuditor: boolean }>;
  findingSeverities: Array<{ code: string; labelEn: string; labelAr: string; slaDays: number; color: string; requiresImmediate: boolean }>;
  findingCategories: Array<{ code: string; labelEn: string; labelAr: string }>;
  auditStandards: Array<{ code: string; labelEn: string; labelAr: string; issuer: string; url?: string }>;
  auditStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  opinionTypes: Array<{ code: string; labelEn: string; labelAr: string; isAdverse: boolean }>;
  scopeTypes: Array<{ code: string; labelEn: string; labelAr: string }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getAuditSeedData(): AuditSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'audit',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: AUDIT_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxFindingsPerAudit: AUDIT_LIMITS.MAX_FINDINGS_PER_AUDIT,
      maxTeamMembers: AUDIT_LIMITS.MAX_TEAM_MEMBERS,
      escalationAfterHours: AUDIT_TIMEOUTS.ESCALATION_AFTER_HOURS,
      slaDefaults: AUDIT_SLA_DEFAULTS,
      maxExportRows: AUDIT_LIMITS.MAX_EXPORT_ROWS,
      defaultSlaHours: AUDIT_TIMEOUTS.DEFAULT_SLA_HOURS,
    },
    defaultTemplates: [
      {
        code: 'audit_internal_default',
        nameEn: 'Internal Audit Template',
        nameAr: 'قالب التدقيق الداخلي',
        data: { version: 1, fields: [], layout: 'standard', auditType: 'internal' },
      },
      {
        code: 'audit_compliance_default',
        nameEn: 'Compliance Audit Template',
        nameAr: 'قالب تدقيق الامتثال',
        data: { version: 1, fields: [], layout: 'compliance', auditType: 'compliance' },
      },
      {
        code: 'audit_it_default',
        nameEn: 'IT Audit Template',
        nameAr: 'قالب تدقيق تقنية المعلومات',
        data: { version: 1, fields: [], layout: 'it', auditType: 'it' },
      },
    ],
    auditTypes: [
      { code: 'internal', labelEn: 'Internal Audit', labelAr: 'تدقيق داخلي', defaultDurationDays: 30, requiresExternalAuditor: false },
      { code: 'external', labelEn: 'External Audit', labelAr: 'تدقيق خارجي', defaultDurationDays: 45, requiresExternalAuditor: true },
      { code: 'compliance', labelEn: 'Compliance Audit', labelAr: 'تدقيق الامتثال', defaultDurationDays: 20, requiresExternalAuditor: false },
      { code: 'it', labelEn: 'IT Audit', labelAr: 'تدقيق تقنية المعلومات', defaultDurationDays: 25, requiresExternalAuditor: false },
      { code: 'financial', labelEn: 'Financial Audit', labelAr: 'التدقيق المالي', defaultDurationDays: 60, requiresExternalAuditor: true },
      { code: 'operational', labelEn: 'Operational Audit', labelAr: 'التدقيق التشغيلي', defaultDurationDays: 30, requiresExternalAuditor: false },
      { code: 'special', labelEn: 'Special Investigation', labelAr: 'تحقيق خاص', defaultDurationDays: 14, requiresExternalAuditor: false },
    ],
    findingSeverities: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', slaDays: AUDIT_SLA_DEFAULTS.critical, color: SEED_COLORS.critical, requiresImmediate: true },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع', slaDays: AUDIT_SLA_DEFAULTS.high, color: SEED_COLORS.high, requiresImmediate: false },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', slaDays: AUDIT_SLA_DEFAULTS.medium, color: SEED_COLORS.medium, requiresImmediate: false },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض', slaDays: AUDIT_SLA_DEFAULTS.low, color: SEED_COLORS.low, requiresImmediate: false },
      { code: 'informational', labelEn: 'Informational', labelAr: 'معلوماتي', slaDays: 720, color: SEED_COLORS.informational, requiresImmediate: false },
    ],
    findingCategories: [
      { code: 'control_deficiency', labelEn: 'Control Deficiency', labelAr: 'قصور في الضوابط' },
      { code: 'process_gap', labelEn: 'Process Gap', labelAr: 'فجوة في العملية' },
      { code: 'policy_violation', labelEn: 'Policy Violation', labelAr: 'مخالفة السياسة' },
      { code: 'regulatory_breach', labelEn: 'Regulatory Breach', labelAr: 'مخالفة تنظيمية' },
      { code: 'best_practice_deviation', labelEn: 'Best Practice Deviation', labelAr: 'انحراف عن أفضل الممارسات' },
      { code: 'fraud_risk', labelEn: 'Fraud Risk', labelAr: 'مخاطر الاحتيال' },
      { code: 'data_integrity', labelEn: 'Data Integrity', labelAr: 'سلامة البيانات' },
      { code: 'access_control', labelEn: 'Access Control', labelAr: 'ضبط الوصول' },
      { code: 'segregation_of_duties', labelEn: 'Segregation of Duties', labelAr: 'الفصل بين المهام' },
      { code: 'documentation', labelEn: 'Documentation', labelAr: 'التوثيق' },
    ],
    auditStandards: [
      {
        code: 'iia_ippf',
        labelEn: 'IIA International Professional Practices Framework',
        labelAr: 'الإطار الدولي للممارسات المهنية - معهد المدققين الداخليين',
        issuer: 'IIA',
        url: 'https://www.theiia.org/en/standards/',
      },
      {
        code: 'iso_19011',
        labelEn: 'ISO 19011 - Guidelines for Auditing Management Systems',
        labelAr: 'ISO 19011 - إرشادات تدقيق أنظمة الإدارة',
        issuer: 'ISO',
        url: 'https://www.iso.org/standard/70017.html',
      },
      {
        code: 'isaca_cobit',
        labelEn: 'ISACA COBIT - Control Objectives for Information Technology',
        labelAr: 'ISACA COBIT - أهداف الرقابة لتقنية المعلومات',
        issuer: 'ISACA',
        url: 'https://www.isaca.org/resources/cobit',
      },
      {
        code: 'isaca_cisa',
        labelEn: 'ISACA CISA - Information Systems Audit and Control',
        labelAr: 'ISACA CISA - تدقيق ورقابة نظم المعلومات',
        issuer: 'ISACA',
      },
      {
        code: 'gaas',
        labelEn: 'Generally Accepted Auditing Standards (GAAS)',
        labelAr: 'معايير التدقيق المقبولة عموماً',
        issuer: 'AICPA',
      },
      {
        code: 'intosai',
        labelEn: 'INTOSAI - International Standards of Supreme Audit Institutions',
        labelAr: 'المعايير الدولية للأجهزة العليا للرقابة المالية والمحاسبة',
        issuer: 'INTOSAI',
        url: 'https://www.issai.org/',
      },
    ],
    auditStatuses: AUDIT_STATUSES.map((code) => {
      const labelMap: Record<string, { en: string; ar: string }> = {
        planned: { en: 'Planned', ar: 'مخطط' },
        fieldwork: { en: 'Fieldwork', ar: 'العمل الميداني' },
        draft_report: { en: 'Draft Report', ar: 'مسودة التقرير' },
        review: { en: 'Under Review', ar: 'قيد المراجعة' },
        final_report: { en: 'Final Report', ar: 'التقرير النهائي' },
        closed: { en: 'Closed', ar: 'مغلق' },
        archived: { en: 'Archived', ar: 'مؤرشف' },
      };
      const label = labelMap[code] || { en: code, ar: code };
      return {
        code,
        labelEn: label.en,
        labelAr: label.ar,
        terminal: (AUDIT_TERMINAL_STATUSES as readonly string[]).includes(code),
      };
    }),
    opinionTypes: [
      { code: 'unqualified', labelEn: 'Unqualified (Clean)', labelAr: 'رأي نظيف (غير مقيد)', isAdverse: false },
      { code: 'qualified', labelEn: 'Qualified', labelAr: 'رأي مقيد', isAdverse: false },
      { code: 'adverse', labelEn: 'Adverse', labelAr: 'رأي سلبي', isAdverse: true },
      { code: 'disclaimer', labelEn: 'Disclaimer of Opinion', labelAr: 'الامتناع عن إبداء الرأي', isAdverse: true },
    ],
    scopeTypes: AUDIT_SCOPES.map((code) => {
      const labelMap: Record<string, { en: string; ar: string }> = {
        organization: { en: 'Organization-wide', ar: 'على مستوى المنظمة' },
        department: { en: 'Department', ar: 'الإدارة' },
        process: { en: 'Process', ar: 'العملية' },
        system: { en: 'System', ar: 'النظام' },
        project: { en: 'Project', ar: 'المشروع' },
        vendor: { en: 'Vendor', ar: 'المورد' },
      };
      const label = labelMap[code] || { en: code, ar: code };
      return { code, labelEn: label.en, labelAr: label.ar };
    }),
  };
}

export async function seedAuditModule(tenantId: string, schema: string): Promise<void> {
  const data = getAuditSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['audit', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
