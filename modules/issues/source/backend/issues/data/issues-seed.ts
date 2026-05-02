import { ISSUES_SLA_DEFAULTS } from './issues-constants';
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
  low:      'var(--primary)',
} as const;

export interface IssuesSeedSlaPolicies {
  severity: string;
  priority: string;
  responseTargetHours: number;
  escalationHours: number;
}

export interface IssuesSeedCategory {
  code: string;
  labelEn: string;
  labelAr: string;
  defaultSeverity: string;
}

export interface IssuesSeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  slaPolicies: IssuesSeedSlaPolicies[];
  categories: IssuesSeedCategory[];
  rootCauseCategories: Array<{ code: string; labelEn: string; labelAr: string }>;
  severities: Array<{ code: string; labelEn: string; labelAr: string; icon: string; color: string }>;
  statuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getIssuesSeedData(): IssuesSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'issues',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: 365,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      slaTrackingEnabled: true,
      deduplicationEnabled: true,
      escalationChainEnabled: true,
      rootCauseAnalysisEnabled: true,
      riskLinkingEnabled: true,
      verificationRequired: true,
    },
    defaultTemplates: [
      { code: 'issues_security_incident', nameEn: 'Security Incident', nameAr: 'حادث أمني', data: { version: 1, fields: ['severity', 'affected_systems', 'attack_vector', 'containment_status'], layout: 'incident' } },
      { code: 'issues_compliance_gap', nameEn: 'Compliance Gap', nameAr: 'فجوة امتثال', data: { version: 1, fields: ['framework', 'control_id', 'gap_description', 'remediation_plan'], layout: 'compliance' } },
      { code: 'issues_audit_finding', nameEn: 'Audit Finding', nameAr: 'ملاحظة تدقيق', data: { version: 1, fields: ['audit_id', 'finding_type', 'recommendation', 'management_response'], layout: 'audit' } },
      { code: 'issues_risk_event', nameEn: 'Risk Event', nameAr: 'حدث خطر', data: { version: 1, fields: ['risk_id', 'impact_assessment', 'likelihood', 'mitigation_steps'], layout: 'risk' } },
      { code: 'issues_vendor_issue', nameEn: 'Vendor Issue', nameAr: 'مشكلة مورد', data: { version: 1, fields: ['vendor_id', 'contract_ref', 'sla_impact', 'escalation_contact'], layout: 'vendor' } },
      { code: 'issues_system_defect', nameEn: 'System Defect', nameAr: 'خلل في النظام', data: { version: 1, fields: ['system_name', 'error_code', 'steps_to_reproduce', 'workaround'], layout: 'defect' } },
      { code: 'issues_policy_violation', nameEn: 'Policy Violation', nameAr: 'مخالفة سياسة', data: { version: 1, fields: ['policy_id', 'violation_type', 'involved_parties', 'corrective_action'], layout: 'policy' } },
      { code: 'issues_corrective_action', nameEn: 'Corrective Action', nameAr: 'إجراء تصحيحي', data: { version: 1, fields: ['source_issue_id', 'action_plan', 'responsible_party', 'target_date'], layout: 'corrective' } },
    ],
    slaPolicies: [
      { severity: 'critical', priority: 'critical', responseTargetHours: ISSUES_SLA_DEFAULTS.critical, escalationHours: 2 },
      { severity: 'critical', priority: 'high', responseTargetHours: ISSUES_SLA_DEFAULTS.critical, escalationHours: 2 },
      { severity: 'high', priority: 'high', responseTargetHours: ISSUES_SLA_DEFAULTS.high, escalationHours: 8 },
      { severity: 'high', priority: 'medium', responseTargetHours: ISSUES_SLA_DEFAULTS.high, escalationHours: 12 },
      { severity: 'medium', priority: 'medium', responseTargetHours: ISSUES_SLA_DEFAULTS.medium, escalationHours: 24 },
      { severity: 'medium', priority: 'low', responseTargetHours: ISSUES_SLA_DEFAULTS.medium, escalationHours: 36 },
      { severity: 'low', priority: 'low', responseTargetHours: ISSUES_SLA_DEFAULTS.low, escalationHours: 72 },
    ],
    categories: [
      { code: 'security_incident', labelEn: 'Security Incident', labelAr: 'حادث أمني', defaultSeverity: 'critical' },
      { code: 'compliance_gap', labelEn: 'Compliance Gap', labelAr: 'فجوة امتثال', defaultSeverity: 'high' },
      { code: 'audit_finding', labelEn: 'Audit Finding', labelAr: 'ملاحظة تدقيق', defaultSeverity: 'high' },
      { code: 'risk_event', labelEn: 'Risk Event', labelAr: 'حدث خطر', defaultSeverity: 'high' },
      { code: 'vendor_issue', labelEn: 'Vendor Issue', labelAr: 'مشكلة مورد', defaultSeverity: 'medium' },
      { code: 'system_defect', labelEn: 'System Defect', labelAr: 'خلل في النظام', defaultSeverity: 'medium' },
      { code: 'policy_violation', labelEn: 'Policy Violation', labelAr: 'مخالفة سياسة', defaultSeverity: 'high' },
      { code: 'process_failure', labelEn: 'Process Failure', labelAr: 'فشل عملية', defaultSeverity: 'medium' },
      { code: 'data_quality', labelEn: 'Data Quality Issue', labelAr: 'مشكلة جودة بيانات', defaultSeverity: 'medium' },
      { code: 'other', labelEn: 'Other', labelAr: 'أخرى', defaultSeverity: 'low' },
    ],
    rootCauseCategories: [
      { code: 'process_gap', labelEn: 'Process Gap', labelAr: 'فجوة في العملية' },
      { code: 'technology_failure', labelEn: 'Technology Failure', labelAr: 'فشل تقني' },
      { code: 'human_error', labelEn: 'Human Error', labelAr: 'خطأ بشري' },
      { code: 'third_party', labelEn: 'Third Party', labelAr: 'طرف ثالث' },
      { code: 'environmental', labelEn: 'Environmental', labelAr: 'بيئي' },
      { code: 'policy_gap', labelEn: 'Policy Gap', labelAr: 'فجوة في السياسة' },
      { code: 'unknown', labelEn: 'Unknown', labelAr: 'غير معروف' },
    ],
    severities: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', icon: 'pi-exclamation-circle', color: SEED_COLORS.critical },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع', icon: 'pi-exclamation-triangle', color: SEED_COLORS.high },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', icon: 'pi-info-circle', color: SEED_COLORS.medium },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض', icon: 'pi-minus-circle', color: SEED_COLORS.low },
    ],
    statuses: [
      { code: 'open', labelEn: 'Open', labelAr: 'مفتوح', terminal: false },
      { code: 'triaged', labelEn: 'Triaged', labelAr: 'مصنف', terminal: false },
      { code: 'investigating', labelEn: 'Investigating', labelAr: 'قيد التحقيق', terminal: false },
      { code: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ', terminal: false },
      { code: 'pending_verification', labelEn: 'Pending Verification', labelAr: 'بانتظار التحقق', terminal: false },
      { code: 'resolved', labelEn: 'Resolved', labelAr: 'تم الحل', terminal: false },
      { code: 'closed', labelEn: 'Closed', labelAr: 'مغلق', terminal: true },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
  };
}

export async function seedIssuesModule(tenantId: string, schema: string): Promise<void> {
  const data = getIssuesSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['issues', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }

  for (const sla of data.slaPolicies) {
    await safeQuery(
      `INSERT INTO "${schema}".issues_sla_policies (severity, priority, response_target_hours, escalation_hours)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (severity, priority) DO NOTHING`,
      [sla.severity, sla.priority, sla.responseTargetHours, sla.escalationHours],
    ).catch(catchHandler(EC.EVENT_BUS));
  }

  for (const tmpl of data.defaultTemplates) {
    await safeQuery(
      `INSERT INTO "${schema}".issues_templates (code, name_en, name_ar, template_data, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code, tenant_id) DO NOTHING`,
      [tmpl.code, tmpl.nameEn, tmpl.nameAr, JSON.stringify(tmpl.data), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
