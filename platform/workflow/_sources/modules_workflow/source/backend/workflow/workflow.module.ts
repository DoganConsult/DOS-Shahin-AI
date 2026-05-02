import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { WORKFLOW_PERMISSIONS, WORKFLOW_ROLES, WORKFLOW_ACTIONS } from './security/workflow.security';
import { WORKFLOW_APPROVAL_MATRIX } from './security/workflow.approval-matrix';
import { WORKFLOW_PUBLISHED_EVENTS, WORKFLOW_CONSUMED_EVENTS } from './events/workflow.events';

export const WORKFLOW_MANIFEST: ModuleManifest = {
  code: 'workflow',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Workflows',
  nameAr: 'سير العمل',
  descriptionEn: 'Workflow engine for approvals, escalations, SLA management, and automation orchestration.',
  descriptionAr: 'محرك سير العمل للموافقات والتصعيد وإدارة مستوى الخدمة وتنسيق الأتمتة.',
  tier: 'platform',
  category: 'platform',
  routeBase: '/api/workflow',
  eventNamespace: 'workflow',
  tablePrefix: 'workflow_',
  ownedTables: [
    'workflows', 'workflow_instances', 'workflow_steps', 'workflow_transitions',
    'workflow_templates', 'workflow_template_library', 'workflow_chains',
    'workflow_chain_links', 'workflow_events', 'workflow_event_log',
    'workflow_sla_configs', 'workflow_escalations', 'workflow_approvals',
    'workflow_compensation_log', 'workflow_ai_notes', 'workflow_ai_drafts',
    'workflow_ai_budgets', 'workflow_kill_switches', 'workflow_boundaries',
    'workflow_autonomy_levels',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams'],
  aggregateRoots: ['workflows', 'workflow_instances', 'workflow_templates'],
  publishedEvents: WORKFLOW_PUBLISHED_EVENTS,
  consumedEvents: WORKFLOW_CONSUMED_EVENTS,
  hardDeps: [],
  softDeps: ['foundation', 'ai', 'risk', 'compliance', 'incident', 'evidence', 'audit', 'policy', 'vendor', 'exception', 'team', 'onboarding', 'dora'] as any,
  navId: 'workflow',
  navChildCount: 6,
  workflowTemplateCode: 'workflow_definition_lifecycle',
  workflowSlaHours: 72,
  automationLevel: 'full',
  agentBinding: 'A02',
  aiCapabilities: ['notes', 'drafts', 'recommendations', 'scoring', 'classification', 'gate_checks', 'health_monitor', 'anomaly_detection'],
  aiEnabled: true,
  featureFlags: ['workflow.chains', 'workflow.ai_orchestrator', 'workflow.kill_switch'],
  installable: true,
  provisioningOrder: 5,
  licensingTier: 'starter',
  visibility: 'internal',
  adminSurfaces: ['workflow-templates', 'sla-config', 'escalation-rules', 'ai-boundaries'],

  securityPermissions: WORKFLOW_PERMISSIONS,
  securityRoles: WORKFLOW_ROLES,
  securityActions: WORKFLOW_ACTIONS,
  approvalRules: WORKFLOW_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'workflows', ownerField: 'created_by', reviewerField: null, approverField: null, assigneeField: 'assigned_to', orgScopeField: 'org_id', defaultOwnerRole: 'workflow.module_lead', canDelegate: true, delegateRoles: ['workflow.operator'], canReassign: true, reassignRoles: ['workflow.module_lead', 'workflow.executive_owner'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'team' },
    { entityType: 'workflow_instances', ownerField: 'started_by', reviewerField: null, approverField: 'approver_id', assigneeField: 'assigned_to', orgScopeField: 'org_id', defaultOwnerRole: 'workflow.operator', canDelegate: true, delegateRoles: ['workflow.contributor'], canReassign: true, reassignRoles: ['workflow.module_lead'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'team' },
    { entityType: 'workflow_templates', ownerField: 'created_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'workflow.module_lead', canDelegate: false, delegateRoles: [], canReassign: false, reassignRoles: [], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'workflow.sod.executor_approver', descriptionEn: 'Executor cannot approve their own workflow', descriptionAr: 'لا يمكن للمنفذ الموافقة على سير العمل الخاص به', conflictingRoles: ['workflow.operator', 'workflow.approver'], conflictingActions: ['workflow.instance.execute', 'workflow.approval.approve'], conflictingTransitions: ['active->approved'], severity: 'high', enforcement: 'hard_block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['dual_approval'], overrideAuthority: ['workflow.sod.override'], auditObligations: ['log_sod_violation', 'notify_compliance_team'] },
    { ruleCode: 'workflow.sod.writer_configurer', descriptionEn: 'Writer cannot configure the same workflow', descriptionAr: 'لا يمكن للكاتب تكوين نفس سير العمل', conflictingRoles: ['workflow.contributor', 'workflow.module_lead'], conflictingActions: ['workflow.instance.write', 'workflow.instance.configure'], conflictingTransitions: [], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['audit_review'], overrideAuthority: ['workflow.sod.override'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/workflow/services/core/workflow.service'
};

registerModule(WORKFLOW_MANIFEST);
