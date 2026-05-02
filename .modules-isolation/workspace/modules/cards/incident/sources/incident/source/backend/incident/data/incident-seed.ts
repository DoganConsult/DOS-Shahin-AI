import { INCIDENT_LIMITS, INCIDENT_TIMEOUTS, INCIDENT_SLA_DEFAULTS } from './incident-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

/**
 * Design-token color references for seed data.
 * Maps semantic meaning to CSS custom property names from grc-tokens.css.
 * At seed time these are stored as token references; the frontend resolves them at render.
 */
const SEED_COLORS = {
  critical: 'var(--severity-critical)',
  high:     'var(--severity-high)',
  medium:   'var(--severity-medium)',
  low:      'var(--severity-low)',
} as const;

export interface IncidentSeedData {
  defaultConfigs: Record<string, unknown>;
  incidentTypes: Array<{ code: string; labelEn: string; labelAr: string; defaultSeverity: string }>;
  severityLevels: Array<{ code: string; labelEn: string; labelAr: string; slaHours: number; color: string }>;
  impactAreas: Array<{ code: string; labelEn: string; labelAr: string }>;
  responsePhases: Array<{ code: string; labelEn: string; labelAr: string; order: number }>;
  incidentStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  notificationRequirements: Array<{ code: string; labelEn: string; labelAr: string }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getIncidentSeedData(): IncidentSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'incident',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: INCIDENT_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxAffectedSystems: INCIDENT_LIMITS.MAX_AFFECTED_SYSTEMS,
      maxResponders: INCIDENT_LIMITS.MAX_RESPONDERS,
      escalationAfterHours: INCIDENT_TIMEOUTS.ESCALATION_AFTER_HOURS,
      slaDefaults: INCIDENT_SLA_DEFAULTS,
      maxExportRows: INCIDENT_LIMITS.MAX_EXPORT_ROWS,
    },
    incidentTypes: [
      { code: 'security_breach', labelEn: 'Security Breach', labelAr: 'اختراق أمني', defaultSeverity: 'critical' },
      { code: 'data_leak', labelEn: 'Data Leak', labelAr: 'تسريب بيانات', defaultSeverity: 'critical' },
      { code: 'system_outage', labelEn: 'System Outage', labelAr: 'انقطاع النظام', defaultSeverity: 'high' },
      { code: 'policy_violation', labelEn: 'Policy Violation', labelAr: 'مخالفة سياسة', defaultSeverity: 'medium' },
      { code: 'physical', labelEn: 'Physical Security', labelAr: 'أمن مادي', defaultSeverity: 'high' },
      { code: 'ransomware', labelEn: 'Ransomware', labelAr: 'برنامج فدية', defaultSeverity: 'critical' },
      { code: 'phishing', labelEn: 'Phishing', labelAr: 'تصيد إلكتروني', defaultSeverity: 'medium' },
      { code: 'insider_threat', labelEn: 'Insider Threat', labelAr: 'تهديد داخلي', defaultSeverity: 'high' },
      { code: 'ddos', labelEn: 'DDoS Attack', labelAr: 'هجوم حرمان الخدمة', defaultSeverity: 'high' },
      { code: 'unauthorized_access', labelEn: 'Unauthorized Access', labelAr: 'وصول غير مصرح', defaultSeverity: 'high' },
      { code: 'natural_disaster', labelEn: 'Natural Disaster', labelAr: 'كارثة طبيعية', defaultSeverity: 'high' },
    ],
    severityLevels: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', slaHours: INCIDENT_SLA_DEFAULTS.critical, color: SEED_COLORS.critical },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع', slaHours: INCIDENT_SLA_DEFAULTS.high, color: SEED_COLORS.high },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', slaHours: INCIDENT_SLA_DEFAULTS.medium, color: SEED_COLORS.medium },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض', slaHours: INCIDENT_SLA_DEFAULTS.low, color: SEED_COLORS.low },
    ],
    impactAreas: [
      { code: 'confidentiality', labelEn: 'Confidentiality', labelAr: 'السرية' },
      { code: 'integrity', labelEn: 'Integrity', labelAr: 'النزاهة' },
      { code: 'availability', labelEn: 'Availability', labelAr: 'التوافر' },
      { code: 'financial', labelEn: 'Financial', labelAr: 'مالي' },
      { code: 'reputational', labelEn: 'Reputational', labelAr: 'السمعة' },
      { code: 'legal', labelEn: 'Legal', labelAr: 'قانوني' },
      { code: 'operational', labelEn: 'Operational', labelAr: 'تشغيلي' },
    ],
    responsePhases: [
      { code: 'preparation', labelEn: 'Preparation', labelAr: 'التحضير', order: 1 },
      { code: 'identification', labelEn: 'Identification', labelAr: 'التحديد', order: 2 },
      { code: 'containment', labelEn: 'Containment', labelAr: 'الاحتواء', order: 3 },
      { code: 'eradication', labelEn: 'Eradication', labelAr: 'الاستئصال', order: 4 },
      { code: 'recovery', labelEn: 'Recovery', labelAr: 'التعافي', order: 5 },
      { code: 'lessons_learned', labelEn: 'Lessons Learned', labelAr: 'الدروس المستفادة', order: 6 },
    ],
    incidentStatuses: [
      { code: 'detected', labelEn: 'Detected', labelAr: 'مكتشف', terminal: false },
      { code: 'triaged', labelEn: 'Triaged', labelAr: 'مصنف', terminal: false },
      { code: 'contained', labelEn: 'Contained', labelAr: 'محتوى', terminal: false },
      { code: 'investigating', labelEn: 'Investigating', labelAr: 'قيد التحقيق', terminal: false },
      { code: 'remediated', labelEn: 'Remediated', labelAr: 'تمت المعالجة', terminal: false },
      { code: 'resolved', labelEn: 'Resolved', labelAr: 'محلول', terminal: false },
      { code: 'closed', labelEn: 'Closed', labelAr: 'مغلق', terminal: true },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
    notificationRequirements: [
      { code: 'internal', labelEn: 'Internal Stakeholders', labelAr: 'أصحاب المصلحة الداخليين' },
      { code: 'regulatory', labelEn: 'Regulatory Authority', labelAr: 'الجهة التنظيمية' },
      { code: 'law_enforcement', labelEn: 'Law Enforcement', labelAr: 'جهات إنفاذ القانون' },
      { code: 'public', labelEn: 'Public Disclosure', labelAr: 'إفصاح عام' },
      { code: 'affected_parties', labelEn: 'Affected Parties', labelAr: 'الأطراف المتضررة' },
    ],
  };
}

export async function seedIncidentModule(tenantId: string, schema: string): Promise<void> {
  const data = getIncidentSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['incident', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
