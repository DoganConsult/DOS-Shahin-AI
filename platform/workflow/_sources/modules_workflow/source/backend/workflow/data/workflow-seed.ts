import { catchHandler, EC } from '@dos/platform-core/resilience';
import {
  WORKFLOW_SLA_DEFAULTS,
  WORKFLOW_TIMEOUTS,
  WORKFLOW_BUSINESS_THRESHOLDS,
} from './workflow-constants';

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

export interface WorkflowTypeDefinition {
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  defaultSlaHours: number;
  requiresApproval: boolean;
  maxParallelBranches: number;
  escalationEnabled: boolean;
}

export interface WorkflowSlaTemplate {
  code: string;
  nameEn: string;
  nameAr: string;
  priority: string;
  warningAtHours: number;
  breachAtHours: number;
  escalationAtHours: number;
  autoEscalate: boolean;
  escalationRoleCode: string;
}

export interface WorkflowEscalationRule {
  code: string;
  triggerCondition: 'overdue' | 'sla_warning' | 'approval_stale' | 'stuck';
  thresholdHours: number;
  escalateTo: string;
  notifyRoles: string[];
  autoReassign: boolean;
  maxEscalations: number;
}

export interface WorkflowStepType {
  code: string;
  nameEn: string;
  nameAr: string;
  requiresAssignee: boolean;
  requiresApproval: boolean;
  timeoutHours: number;
  retryable: boolean;
}

export interface WorkflowSeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  workflowTypes: WorkflowTypeDefinition[];
  slaTemplates: WorkflowSlaTemplate[];
  escalationRules: WorkflowEscalationRule[];
  stepTypes: WorkflowStepType[];
  taskPriorities: Array<{ code: string; nameEn: string; nameAr: string; slaHours: number; color: string }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export const WORKFLOW_TYPE_DEFINITIONS: WorkflowTypeDefinition[] = [
  {
    code: 'approval',
    nameEn: 'Approval Workflow',
    nameAr: 'سير عمل الاعتماد',
    descriptionEn: 'Multi-stage approval chains for decisions and requests',
    descriptionAr: 'سلاسل اعتماد متعددة المراحل للقرارات والطلبات',
    defaultSlaHours: WORKFLOW_SLA_DEFAULTS.medium,
    requiresApproval: true,
    maxParallelBranches: 3,
    escalationEnabled: true,
  },
  {
    code: 'review',
    nameEn: 'Review & Sign-off',
    nameAr: 'المراجعة والموافقة',
    descriptionEn: 'Document review, sign-off, and attestation processes',
    descriptionAr: 'عمليات مراجعة المستندات والموافقة عليها والتحقق منها',
    defaultSlaHours: WORKFLOW_SLA_DEFAULTS.high,
    requiresApproval: true,
    maxParallelBranches: 5,
    escalationEnabled: true,
  },
  {
    code: 'onboarding',
    nameEn: 'Onboarding',
    nameAr: 'الإعداد والتهيئة',
    descriptionEn: 'Employee or vendor onboarding lifecycle management',
    descriptionAr: 'إدارة دورة حياة إعداد الموظفين أو الموردين',
    defaultSlaHours: WORKFLOW_TIMEOUTS.DEFAULT_SLA_HOURS * 3,
    requiresApproval: false,
    maxParallelBranches: 4,
    escalationEnabled: false,
  },
  {
    code: 'incident_response',
    nameEn: 'Incident Response',
    nameAr: 'الاستجابة للحوادث',
    descriptionEn: 'Structured response playbooks for security and operational incidents',
    descriptionAr: 'بيانات استجابة منظمة للحوادث الأمنية والتشغيلية',
    defaultSlaHours: WORKFLOW_SLA_DEFAULTS.critical,
    requiresApproval: false,
    maxParallelBranches: 10,
    escalationEnabled: true,
  },
  {
    code: 'change_management',
    nameEn: 'Change Management',
    nameAr: 'إدارة التغيير',
    descriptionEn: 'Controlled change request, impact assessment, and rollout lifecycle',
    descriptionAr: 'طلب التغيير الخاضع للرقابة وتقييم الأثر ودورة حياة التطوير',
    defaultSlaHours: WORKFLOW_SLA_DEFAULTS.high,
    requiresApproval: true,
    maxParallelBranches: 3,
    escalationEnabled: true,
  },
  {
    code: 'risk_assessment',
    nameEn: 'Risk Assessment',
    nameAr: 'تقييم المخاطر',
    descriptionEn: 'Structured risk identification, scoring, and treatment workflows',
    descriptionAr: 'سير عمل منظم لتحديد المخاطر وتقييمها ومعالجتها',
    defaultSlaHours: WORKFLOW_SLA_DEFAULTS.low,
    requiresApproval: true,
    maxParallelBranches: 2,
    escalationEnabled: true,
  },
  {
    code: 'general',
    nameEn: 'General Workflow',
    nameAr: 'سير العمل العام',
    descriptionEn: 'Generic configurable workflow for custom business processes',
    descriptionAr: 'سير عمل عام قابل للتهيئة للعمليات التجارية المخصصة',
    defaultSlaHours: WORKFLOW_TIMEOUTS.DEFAULT_SLA_HOURS,
    requiresApproval: false,
    maxParallelBranches: 5,
    escalationEnabled: false,
  },
];

export const WORKFLOW_SLA_TEMPLATES: WorkflowSlaTemplate[] = [
  {
    code: 'sla_critical',
    nameEn: 'Critical SLA',
    nameAr: 'مستوى خدمة حرجة',
    priority: 'critical',
    warningAtHours: Math.floor(WORKFLOW_SLA_DEFAULTS.critical * 0.75),
    breachAtHours: WORKFLOW_SLA_DEFAULTS.critical,
    escalationAtHours: Math.floor(WORKFLOW_SLA_DEFAULTS.critical * 0.5),
    autoEscalate: true,
    escalationRoleCode: 'workflow_executive_owner',
  },
  {
    code: 'sla_high',
    nameEn: 'High Priority SLA',
    nameAr: 'مستوى خدمة عالي الأولوية',
    priority: 'high',
    warningAtHours: Math.floor(WORKFLOW_SLA_DEFAULTS.high * 0.75),
    breachAtHours: WORKFLOW_SLA_DEFAULTS.high,
    escalationAtHours: Math.floor(WORKFLOW_SLA_DEFAULTS.high * 0.5),
    autoEscalate: true,
    escalationRoleCode: 'workflow_manager',
  },
  {
    code: 'sla_medium',
    nameEn: 'Standard SLA',
    nameAr: 'مستوى الخدمة القياسي',
    priority: 'medium',
    warningAtHours: Math.floor(WORKFLOW_SLA_DEFAULTS.medium * 0.75),
    breachAtHours: WORKFLOW_SLA_DEFAULTS.medium,
    escalationAtHours: Math.floor(WORKFLOW_SLA_DEFAULTS.medium * 0.9),
    autoEscalate: false,
    escalationRoleCode: 'workflow_manager',
  },
  {
    code: 'sla_low',
    nameEn: 'Low Priority SLA',
    nameAr: 'مستوى خدمة منخفض الأولوية',
    priority: 'low',
    warningAtHours: Math.floor(WORKFLOW_SLA_DEFAULTS.low * 0.75),
    breachAtHours: WORKFLOW_SLA_DEFAULTS.low,
    escalationAtHours: Math.floor(WORKFLOW_SLA_DEFAULTS.low * 0.9),
    autoEscalate: false,
    escalationRoleCode: 'workflow_approver',
  },
];

export const WORKFLOW_ESCALATION_RULES: WorkflowEscalationRule[] = [
  {
    code: 'escalate_overdue_critical',
    triggerCondition: 'overdue',
    thresholdHours: WORKFLOW_SLA_DEFAULTS.critical,
    escalateTo: 'workflow_executive_owner',
    notifyRoles: ['workflow_executive_owner', 'workflow_manager'],
    autoReassign: true,
    maxEscalations: 3,
  },
  {
    code: 'escalate_overdue_high',
    triggerCondition: 'overdue',
    thresholdHours: WORKFLOW_SLA_DEFAULTS.high,
    escalateTo: 'workflow_manager',
    notifyRoles: ['workflow_manager', 'workflow_approver'],
    autoReassign: false,
    maxEscalations: 2,
  },
  {
    code: 'escalate_approval_stale',
    triggerCondition: 'approval_stale',
    thresholdHours: WORKFLOW_TIMEOUTS.ESCALATION_AFTER_HOURS,
    escalateTo: 'workflow_manager',
    notifyRoles: ['workflow_approver', 'workflow_manager'],
    autoReassign: false,
    maxEscalations: 2,
  },
  {
    code: 'escalate_stuck_workflow',
    triggerCondition: 'stuck',
    thresholdHours: WORKFLOW_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS * 24,
    escalateTo: 'workflow_manager',
    notifyRoles: ['workflow_manager'],
    autoReassign: false,
    maxEscalations: 1,
  },
  {
    code: 'escalate_sla_warning',
    triggerCondition: 'sla_warning',
    thresholdHours: WORKFLOW_TIMEOUTS.REMINDER_BEFORE_HOURS,
    escalateTo: 'workflow_approver',
    notifyRoles: ['workflow_operator', 'workflow_approver'],
    autoReassign: false,
    maxEscalations: 1,
  },
];

export const WORKFLOW_STEP_TYPES: WorkflowStepType[] = [
  {
    code: 'manual_task',
    nameEn: 'Manual Task',
    nameAr: 'مهمة يدوية',
    requiresAssignee: true,
    requiresApproval: false,
    timeoutHours: WORKFLOW_TIMEOUTS.STEP_DEFAULT_TIMEOUT_HOURS,
    retryable: true,
  },
  {
    code: 'approval_gate',
    nameEn: 'Approval Gate',
    nameAr: 'بوابة الاعتماد',
    requiresAssignee: true,
    requiresApproval: true,
    timeoutHours: WORKFLOW_SLA_DEFAULTS.medium,
    retryable: false,
  },
  {
    code: 'review_sign_off',
    nameEn: 'Review & Sign-off',
    nameAr: 'المراجعة والتوقيع',
    requiresAssignee: true,
    requiresApproval: true,
    timeoutHours: WORKFLOW_SLA_DEFAULTS.high,
    retryable: false,
  },
  {
    code: 'automated_check',
    nameEn: 'Automated Check',
    nameAr: 'فحص تلقائي',
    requiresAssignee: false,
    requiresApproval: false,
    timeoutHours: 1,
    retryable: true,
  },
  {
    code: 'notification',
    nameEn: 'Notification',
    nameAr: 'إشعار',
    requiresAssignee: false,
    requiresApproval: false,
    timeoutHours: 0,
    retryable: true,
  },
  {
    code: 'parallel_split',
    nameEn: 'Parallel Split',
    nameAr: 'تفرع متوازٍ',
    requiresAssignee: false,
    requiresApproval: false,
    timeoutHours: 0,
    retryable: false,
  },
  {
    code: 'parallel_join',
    nameEn: 'Parallel Join',
    nameAr: 'دمج متوازٍ',
    requiresAssignee: false,
    requiresApproval: false,
    timeoutHours: WORKFLOW_TIMEOUTS.STEP_DEFAULT_TIMEOUT_HOURS,
    retryable: false,
  },
  {
    code: 'conditional_branch',
    nameEn: 'Conditional Branch',
    nameAr: 'تفرع شرطي',
    requiresAssignee: false,
    requiresApproval: false,
    timeoutHours: 0,
    retryable: false,
  },
  {
    code: 'data_collection',
    nameEn: 'Data Collection',
    nameAr: 'جمع البيانات',
    requiresAssignee: true,
    requiresApproval: false,
    timeoutHours: WORKFLOW_TIMEOUTS.STEP_DEFAULT_TIMEOUT_HOURS,
    retryable: true,
  },
  {
    code: 'external_integration',
    nameEn: 'External Integration',
    nameAr: 'تكامل خارجي',
    requiresAssignee: false,
    requiresApproval: false,
    timeoutHours: 4,
    retryable: true,
  },
];

const TASK_PRIORITIES = [
  { code: 'critical', nameEn: 'Critical', nameAr: 'حرجة', slaHours: WORKFLOW_SLA_DEFAULTS.critical, color: SEED_COLORS.critical },
  { code: 'high', nameEn: 'High', nameAr: 'عالية', slaHours: WORKFLOW_SLA_DEFAULTS.high, color: SEED_COLORS.high },
  { code: 'medium', nameEn: 'Medium', nameAr: 'متوسطة', slaHours: WORKFLOW_SLA_DEFAULTS.medium, color: SEED_COLORS.medium },
  { code: 'low', nameEn: 'Low', nameAr: 'منخفضة', slaHours: WORKFLOW_SLA_DEFAULTS.low, color: SEED_COLORS.low },
];

export function getWorkflowSeedData(): WorkflowSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'workflow',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: WORKFLOW_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      defaultSlaHours: WORKFLOW_TIMEOUTS.DEFAULT_SLA_HOURS,
      escalationEnabled: true,
      escalationAfterHours: WORKFLOW_TIMEOUTS.ESCALATION_AFTER_HOURS,
      reminderBeforeHours: WORKFLOW_TIMEOUTS.REMINDER_BEFORE_HOURS,
      slaWarningThresholdPct: 75,
      successRateWarning: WORKFLOW_BUSINESS_THRESHOLDS.SUCCESS_RATE_WARNING,
      successRateCritical: WORKFLOW_BUSINESS_THRESHOLDS.SUCCESS_RATE_CRITICAL,
      maxInstanceDurationDays: WORKFLOW_BUSINESS_THRESHOLDS.MAX_INSTANCE_DURATION_DAYS,
      staleAfterDays: WORKFLOW_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS,
      approvalReminderIntervalHours: 8,
      maxApprovalEscalations: 3,
      supportedWorkflowTypes: WORKFLOW_TYPE_DEFINITIONS.map(t => t.code),
    },
    defaultTemplates: [
      {
        code: 'workflow_approval_standard',
        nameEn: 'Standard Approval Workflow',
        nameAr: 'سير عمل الاعتماد القياسي',
        data: {
          version: 1,
          workflowType: 'approval',
          steps: [
            { code: 'submit', type: 'manual_task', order: 1, requiredRole: 'workflow_operator' },
            { code: 'review', type: 'review_sign_off', order: 2, requiredRole: 'workflow_reviewer' },
            { code: 'approve', type: 'approval_gate', order: 3, requiredRole: 'workflow_approver' },
            { code: 'complete', type: 'notification', order: 4 },
          ],
          slaHours: WORKFLOW_SLA_DEFAULTS.medium,
        },
      },
      {
        code: 'workflow_change_management',
        nameEn: 'Change Management Workflow',
        nameAr: 'سير عمل إدارة التغيير',
        data: {
          version: 1,
          workflowType: 'change_management',
          steps: [
            { code: 'request', type: 'manual_task', order: 1, requiredRole: 'workflow_operator' },
            { code: 'impact_assessment', type: 'data_collection', order: 2, requiredRole: 'workflow_reviewer' },
            { code: 'technical_review', type: 'review_sign_off', order: 3, requiredRole: 'workflow_reviewer' },
            { code: 'cab_approval', type: 'approval_gate', order: 4, requiredRole: 'workflow_approver' },
            { code: 'implementation', type: 'manual_task', order: 5, requiredRole: 'workflow_operator' },
            { code: 'post_review', type: 'review_sign_off', order: 6, requiredRole: 'workflow_reviewer' },
            { code: 'close', type: 'notification', order: 7 },
          ],
          slaHours: WORKFLOW_SLA_DEFAULTS.high,
        },
      },
      {
        code: 'workflow_incident_response',
        nameEn: 'Incident Response Playbook',
        nameAr: 'دليل الاستجابة للحوادث',
        data: {
          version: 1,
          workflowType: 'incident_response',
          steps: [
            { code: 'triage', type: 'manual_task', order: 1, requiredRole: 'workflow_operator' },
            { code: 'containment', type: 'manual_task', order: 2, requiredRole: 'workflow_operator' },
            { code: 'investigation', type: 'data_collection', order: 3, requiredRole: 'workflow_reviewer' },
            { code: 'remediation', type: 'manual_task', order: 4, requiredRole: 'workflow_operator' },
            { code: 'sign_off', type: 'approval_gate', order: 5, requiredRole: 'workflow_approver' },
            { code: 'lessons_learned', type: 'data_collection', order: 6, requiredRole: 'workflow_reviewer' },
          ],
          slaHours: WORKFLOW_SLA_DEFAULTS.critical,
        },
      },
      {
        code: 'workflow_risk_assessment',
        nameEn: 'Risk Assessment Workflow',
        nameAr: 'سير عمل تقييم المخاطر',
        data: {
          version: 1,
          workflowType: 'risk_assessment',
          steps: [
            { code: 'identify', type: 'data_collection', order: 1, requiredRole: 'workflow_operator' },
            { code: 'score', type: 'data_collection', order: 2, requiredRole: 'workflow_reviewer' },
            { code: 'treatment', type: 'manual_task', order: 3, requiredRole: 'workflow_operator' },
            { code: 'approve', type: 'approval_gate', order: 4, requiredRole: 'workflow_approver' },
            { code: 'notify', type: 'notification', order: 5 },
          ],
          slaHours: WORKFLOW_SLA_DEFAULTS.low,
        },
      },
    ],
    workflowTypes: WORKFLOW_TYPE_DEFINITIONS,
    slaTemplates: WORKFLOW_SLA_TEMPLATES,
    escalationRules: WORKFLOW_ESCALATION_RULES,
    stepTypes: WORKFLOW_STEP_TYPES,
    taskPriorities: TASK_PRIORITIES,
  };
}

export async function seedWorkflowModule(tenantId: string, schema: string): Promise<void> {
  const data = getWorkflowSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['workflow', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }

  for (const tmpl of data.defaultTemplates) {
    await safeQuery(
      `INSERT INTO "${schema}".workflow_templates (code, name_en, name_ar, definition, tenant_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (code, tenant_id) DO NOTHING`,
      [tmpl.code, tmpl.nameEn, tmpl.nameAr, JSON.stringify(tmpl.data), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
