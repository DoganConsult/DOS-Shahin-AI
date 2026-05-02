import { catchHandler, EC } from '@dos/platform-core/resilience';
import { safeQuery } from '../ports/database.port';
import {
  RISK_LIMITS,
  RISK_TIMEOUTS,
  RISK_SLA_DEFAULTS,
  RISK_MATRIX_SIZE,
  RISK_SCORE_RANGE,
  RISK_CATEGORIES as _RISK_CATEGORIES,
  RISK_APPETITE_LEVELS as _RISK_APPETITE_LEVELS,
  RISK_TREATMENT_OPTIONS as _RISK_TREATMENT_OPTIONS,
} from './risk-constants';

/**
 * Design-token color references for seed data.
 * Maps semantic meaning to CSS custom property names from grc-tokens.css.
 * At seed time these are stored as token references; the frontend resolves them at render.
 */
const SEED_COLORS = {
  // Risk categories
  strategic:    'var(--hub-governance)',
  operational:  'var(--severity-medium)',
  financial:    'var(--success)',
  compliance:   'var(--primary)',
  technology:   'var(--hub-risk)',
  cyber:        'var(--error)',
  reputational: 'var(--hub-compliance)',
  third_party:  'var(--info)',
  // Severity
  critical:     'var(--severity-critical)',
  high:         'var(--severity-high)',
  medium:       'var(--severity-medium)',
  low:          'var(--severity-low)',
  // Appetite
  very_low:     'var(--severity-low)',
  appetite_low: 'var(--success)',
  appetite_med: 'var(--severity-medium)',
  appetite_high:'var(--severity-high)',
  very_high:    'var(--severity-critical)',
} as const;

export interface RiskSeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  riskCategories: Array<{ code: string; labelEn: string; labelAr: string; defaultAppetiteScore: number; color: string }>;
  severityLevels: Array<{ code: string; labelEn: string; labelAr: string; minScore: number; maxScore: number; slaHours: number; color: string }>;
  treatmentTypes: Array<{ code: string; labelEn: string; labelAr: string; reducesScore: boolean; requiresApproval: boolean }>;
  riskAppetiteLevels: Array<{ code: string; labelEn: string; labelAr: string; maxScoreAllowed: number; color: string }>;
  kriTypes: Array<{ code: string; labelEn: string; labelAr: string; category: string; unit: string; defaultWarningThreshold: number; defaultBreachThreshold: number }>;
  riskStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean; requiresTreatment: boolean }>;
  assessmentFrequencies: Array<{ code: string; labelEn: string; labelAr: string; intervalDays: number }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getRiskSeedData(): RiskSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'risk',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: RISK_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxLinkedControls: RISK_LIMITS.MAX_LINKED_CONTROLS,
      maxLinkedEntities: RISK_LIMITS.MAX_LINKED_ENTITIES,
      escalationAfterHours: RISK_TIMEOUTS.ESCALATION_AFTER_HOURS,
      slaDefaults: RISK_SLA_DEFAULTS,
      maxExportRows: RISK_LIMITS.MAX_EXPORT_ROWS,
      riskMatrixSize: RISK_MATRIX_SIZE,
      scoreRange: RISK_SCORE_RANGE,
      reassessmentIntervalDays: 90,
      appetiteBreachAlertEnabled: true,
      kriMonitoringEnabled: true,
      treatmentApprovalRequired: true,
    },
    defaultTemplates: [
      {
        code: 'risk_default',
        nameEn: 'Standard Risk Register Template',
        nameAr: 'قالب سجل المخاطر القياسي',
        data: { version: 1, fields: ['title', 'description', 'category', 'likelihood', 'impact', 'owner', 'treatment_type'], layout: 'standard' },
      },
      {
        code: 'risk_strategic',
        nameEn: 'Strategic Risk Assessment Template',
        nameAr: 'قالب تقييم المخاطر الاستراتيجية',
        data: { version: 1, fields: ['title', 'description', 'strategic_objective', 'likelihood', 'impact', 'residual_score', 'treatment_type', 'kri_linked'], layout: 'strategic' },
      },
      {
        code: 'risk_cyber',
        nameEn: 'Cybersecurity Risk Template',
        nameAr: 'قالب مخاطر الأمن السيبراني',
        data: { version: 1, fields: ['title', 'description', 'threat_actor', 'vulnerability', 'likelihood', 'impact', 'cve_reference', 'treatment_type'], layout: 'cyber' },
      },
    ],
    riskCategories: [
      { code: 'strategic', labelEn: 'Strategic', labelAr: 'استراتيجي', defaultAppetiteScore: 12, color: SEED_COLORS.strategic },
      { code: 'operational', labelEn: 'Operational', labelAr: 'تشغيلي', defaultAppetiteScore: 9, color: SEED_COLORS.operational },
      { code: 'financial', labelEn: 'Financial', labelAr: 'مالي', defaultAppetiteScore: 9, color: SEED_COLORS.financial },
      { code: 'compliance', labelEn: 'Compliance', labelAr: 'امتثال', defaultAppetiteScore: 6, color: SEED_COLORS.compliance },
      { code: 'technology', labelEn: 'Technology', labelAr: 'تقنية', defaultAppetiteScore: 12, color: SEED_COLORS.technology },
      { code: 'cyber', labelEn: 'Cybersecurity', labelAr: 'أمن سيبراني', defaultAppetiteScore: 6, color: SEED_COLORS.cyber },
      { code: 'reputational', labelEn: 'Reputational', labelAr: 'سمعة', defaultAppetiteScore: 9, color: SEED_COLORS.reputational },
      { code: 'third_party', labelEn: 'Third Party', labelAr: 'طرف ثالث', defaultAppetiteScore: 12, color: SEED_COLORS.third_party },
    ],
    severityLevels: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', minScore: 20, maxScore: RISK_SCORE_RANGE.MAX, slaHours: RISK_SLA_DEFAULTS.critical, color: SEED_COLORS.critical },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع', minScore: 12, maxScore: 19, slaHours: RISK_SLA_DEFAULTS.high, color: SEED_COLORS.high },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', minScore: 6, maxScore: 11, slaHours: RISK_SLA_DEFAULTS.medium, color: SEED_COLORS.medium },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض', minScore: RISK_SCORE_RANGE.MIN, maxScore: 5, slaHours: RISK_SLA_DEFAULTS.low, color: SEED_COLORS.low },
    ],
    treatmentTypes: [
      { code: 'mitigate', labelEn: 'Mitigate', labelAr: 'تخفيف', reducesScore: true, requiresApproval: false },
      { code: 'transfer', labelEn: 'Transfer', labelAr: 'نقل', reducesScore: true, requiresApproval: true },
      { code: 'accept', labelEn: 'Accept', labelAr: 'قبول', reducesScore: false, requiresApproval: true },
      { code: 'avoid', labelEn: 'Avoid', labelAr: 'تجنب', reducesScore: true, requiresApproval: true },
    ],
    riskAppetiteLevels: [
      { code: 'very_low', labelEn: 'Very Low', labelAr: 'منخفض جداً', maxScoreAllowed: 3, color: SEED_COLORS.very_low },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض', maxScoreAllowed: 6, color: SEED_COLORS.appetite_low },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', maxScoreAllowed: 12, color: SEED_COLORS.appetite_med },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع', maxScoreAllowed: 16, color: SEED_COLORS.appetite_high },
      { code: 'very_high', labelEn: 'Very High', labelAr: 'مرتفع جداً', maxScoreAllowed: RISK_SCORE_RANGE.MAX, color: SEED_COLORS.very_high },
    ],
    kriTypes: [
      { code: 'overdue_risk_count', labelEn: 'Overdue Risk Count', labelAr: 'عدد المخاطر المتأخرة', category: 'operational', unit: 'count', defaultWarningThreshold: 5, defaultBreachThreshold: 10 },
      { code: 'critical_untreated_count', labelEn: 'Critical Untreated Risks', labelAr: 'المخاطر الحرجة غير المعالجة', category: 'operational', unit: 'count', defaultWarningThreshold: 2, defaultBreachThreshold: 5 },
      { code: 'avg_residual_score', labelEn: 'Average Residual Score', labelAr: 'متوسط الدرجة المتبقية', category: 'risk', unit: 'score', defaultWarningThreshold: 12, defaultBreachThreshold: 16 },
      { code: 'treatment_coverage_pct', labelEn: 'Treatment Coverage %', labelAr: 'نسبة تغطية المعالجة', category: 'operational', unit: 'percent', defaultWarningThreshold: 60, defaultBreachThreshold: 40 },
      { code: 'overdue_reassessment_count', labelEn: 'Overdue Reassessment Count', labelAr: 'عدد إعادة التقييم المتأخرة', category: 'compliance', unit: 'count', defaultWarningThreshold: 3, defaultBreachThreshold: 8 },
      { code: 'appetite_breach_count', labelEn: 'Risk Appetite Breach Count', labelAr: 'عدد خروقات شهية المخاطر', category: 'strategic', unit: 'count', defaultWarningThreshold: 1, defaultBreachThreshold: 3 },
      { code: 'new_critical_risks_30d', labelEn: 'New Critical Risks (30d)', labelAr: 'المخاطر الحرجة الجديدة (30 يوم)', category: 'risk', unit: 'count', defaultWarningThreshold: 3, defaultBreachThreshold: 7 },
      { code: 'closure_rate_pct', labelEn: 'Risk Closure Rate %', labelAr: 'نسبة إغلاق المخاطر', category: 'operational', unit: 'percent', defaultWarningThreshold: 40, defaultBreachThreshold: 20 },
    ],
    riskStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false, requiresTreatment: false },
      { code: 'submitted', labelEn: 'Submitted', labelAr: 'مقدّم', terminal: false, requiresTreatment: false },
      { code: 'under_review', labelEn: 'Under Review', labelAr: 'قيد المراجعة', terminal: false, requiresTreatment: false },
      { code: 'assessed', labelEn: 'Assessed', labelAr: 'مقيّمة', terminal: false, requiresTreatment: false },
      { code: 'treatment_planned', labelEn: 'Treatment Planned', labelAr: 'خطة علاج محددة', terminal: false, requiresTreatment: true },
      { code: 'approved', labelEn: 'Approved', labelAr: 'معتمد', terminal: false, requiresTreatment: false },
      { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false, requiresTreatment: false },
      { code: 'monitoring', labelEn: 'Monitoring', labelAr: 'قيد المراقبة', terminal: false, requiresTreatment: false },
      { code: 'closed', labelEn: 'Closed', labelAr: 'مغلقة', terminal: true, requiresTreatment: false },
      { code: 'retired', labelEn: 'Retired', labelAr: 'متقاعد', terminal: true, requiresTreatment: false },
      { code: 'returned', labelEn: 'Returned', labelAr: 'مرتجع', terminal: false, requiresTreatment: false },
      { code: 'identified', labelEn: 'Identified', labelAr: 'محددة', terminal: false, requiresTreatment: false },
      { code: 'mitigating', labelEn: 'Mitigating', labelAr: 'قيد التخفيف', terminal: false, requiresTreatment: true },
      { code: 'accepted', labelEn: 'Accepted', labelAr: 'مقبولة', terminal: false, requiresTreatment: false },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشفة', terminal: true, requiresTreatment: false },
    ],
    assessmentFrequencies: [
      { code: 'monthly', labelEn: 'Monthly', labelAr: 'شهري', intervalDays: 30 },
      { code: 'quarterly', labelEn: 'Quarterly', labelAr: 'ربع سنوي', intervalDays: 90 },
      { code: 'semi_annual', labelEn: 'Semi-Annual', labelAr: 'نصف سنوي', intervalDays: 180 },
      { code: 'annual', labelEn: 'Annual', labelAr: 'سنوي', intervalDays: 365 },
    ],
  };
}

export async function seedRiskModule(tenantId: string, schema: string): Promise<void> {
  const data = getRiskSeedData();

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['risk', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
