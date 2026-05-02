import { ACTION_LIMITS, ACTION_TIMEOUTS, ACTION_BUSINESS_THRESHOLDS } from './action-constants';
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

export interface ActionSeedData {
  defaultConfigs: Record<string, unknown>;
  actionTypes: Array<{ code: string; labelEn: string; labelAr: string; defaultPriority: string }>;
  sourceTypes: Array<{ code: string; labelEn: string; labelAr: string; moduleLink: string | null }>;
  priorities: Array<{ code: string; labelEn: string; labelAr: string; slaHours: number; color: string }>;
  actionStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  recurrenceTypes: Array<{ code: string; labelEn: string; labelAr: string }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getActionSeedData(): ActionSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'action',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: ACTION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      maxSubtasks: ACTION_LIMITS.MAX_SUBTASKS,
      maxAssignees: ACTION_LIMITS.MAX_ASSIGNEES,
      maxWatchers: ACTION_LIMITS.MAX_WATCHERS,
      overdueEscalationHours: ACTION_BUSINESS_THRESHOLDS.OVERDUE_ESCALATION_HOURS,
      staleAfterDays: ACTION_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS,
      maxExportRows: ACTION_LIMITS.MAX_EXPORT_ROWS,
    },
    actionTypes: [
      { code: 'task', labelEn: 'Task', labelAr: 'مهمة', defaultPriority: 'medium' },
      { code: 'corrective', labelEn: 'Corrective Action', labelAr: 'إجراء تصحيحي', defaultPriority: 'high' },
      { code: 'preventive', labelEn: 'Preventive Action', labelAr: 'إجراء وقائي', defaultPriority: 'medium' },
      { code: 'improvement', labelEn: 'Improvement Action', labelAr: 'إجراء تحسيني', defaultPriority: 'low' },
      { code: 'follow_up', labelEn: 'Follow-Up', labelAr: 'متابعة', defaultPriority: 'medium' },
      { code: 'mitigation', labelEn: 'Risk Mitigation', labelAr: 'تخفيف المخاطر', defaultPriority: 'high' },
      { code: 'compliance', labelEn: 'Compliance Action', labelAr: 'إجراء امتثال', defaultPriority: 'high' },
    ],
    sourceTypes: [
      { code: 'manual', labelEn: 'Manual Entry', labelAr: 'إدخال يدوي', moduleLink: null },
      { code: 'audit_finding', labelEn: 'Audit Finding', labelAr: 'نتيجة تدقيق', moduleLink: 'audit' },
      { code: 'risk', labelEn: 'Risk Assessment', labelAr: 'تقييم مخاطر', moduleLink: 'risk' },
      { code: 'incident', labelEn: 'Incident', labelAr: 'حادث', moduleLink: 'incident' },
      { code: 'compliance_gap', labelEn: 'Compliance Gap', labelAr: 'فجوة امتثال', moduleLink: 'compliance' },
      { code: 'vulnerability', labelEn: 'Vulnerability', labelAr: 'ثغرة أمنية', moduleLink: 'risk' },
      { code: 'workflow', labelEn: 'Workflow', labelAr: 'سير عمل', moduleLink: 'workflow' },
    ],
    priorities: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', slaHours: 4, color: SEED_COLORS.critical },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع', slaHours: 24, color: SEED_COLORS.high },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', slaHours: 72, color: SEED_COLORS.medium },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض', slaHours: 168, color: SEED_COLORS.low },
    ],
    actionStatuses: [
      { code: 'open', labelEn: 'Open', labelAr: 'مفتوح', terminal: false },
      { code: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ', terminal: false },
      { code: 'pending_review', labelEn: 'Pending Review', labelAr: 'في انتظار المراجعة', terminal: false },
      { code: 'completed', labelEn: 'Completed', labelAr: 'مكتمل', terminal: true },
      { code: 'overdue', labelEn: 'Overdue', labelAr: 'متأخر', terminal: false },
      { code: 'cancelled', labelEn: 'Cancelled', labelAr: 'ملغي', terminal: true },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
    recurrenceTypes: [
      { code: 'none', labelEn: 'No Recurrence', labelAr: 'بدون تكرار' },
      { code: 'daily', labelEn: 'Daily', labelAr: 'يومي' },
      { code: 'weekly', labelEn: 'Weekly', labelAr: 'أسبوعي' },
      { code: 'monthly', labelEn: 'Monthly', labelAr: 'شهري' },
      { code: 'quarterly', labelEn: 'Quarterly', labelAr: 'ربع سنوي' },
      { code: 'annually', labelEn: 'Annually', labelAr: 'سنوي' },
    ],
  };
}

export async function seedActionModule(tenantId: string, schema: string): Promise<void> {
  const data = getActionSeedData();
  const { safeQuery } = await import('@dos/db');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['action', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
