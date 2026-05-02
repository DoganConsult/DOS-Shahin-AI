import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { REMEDIATION_PERMISSIONS, REMEDIATION_ROLES, REMEDIATION_ACTIONS } from './security/remediation.security';
import { REMEDIATION_APPROVAL_MATRIX } from './security/remediation.approval-matrix';

export const REMEDIATION_MANIFEST: ModuleManifest = {
  code: 'remediation',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Remediation',
  nameAr: 'المعالجة',
  descriptionEn: 'Remediation plan tracking, milestone management, verification, and cross-module gap closure.',
  descriptionAr: 'تتبع خطط المعالجة وإدارة المعالم والتحقق وإغلاق الفجوات عبر الوحدات.',
  tier: 'full',
  category: 'core_grc',
  routeBase: '/api/remediation',
  eventNamespace: 'remediation',
  tablePrefix: 'remediation_',
  ownedTables: [
    'remediation_actions', 'remediation_audit_log', 'remediation_evidence_links',
    'remediation_milestones', 'remediation_plans', 'remediation_progress',
    'remediation_source_links', 'remediation_status_history', 'remediation_teams',
    'remediation_templates', 'remediation_verification_results',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams', 'workflows', 'compliance_gaps', 'risk_assessments', 'audit_findings'],
  aggregateRoots: ['remediation_plans', 'remediation_actions', 'remediation_milestones'],
  publishedEvents: [
    'remediation.plan_created', 'remediation.plan_approved',
    'remediation.action_assigned', 'remediation.action_completed',
    'remediation.milestone_reached', 'remediation.overdue',
    'remediation.verified', 'remediation.closed',
    'remediation.progress_updated', 'remediation.escalated',
  ],
  consumedEvents: [
    'compliance.gap_detected', 'audit.finding_created', 'risk.residual_high',
    'incident.capa_assigned', 'vendor.issue_created', 'workflow.status_changed',
  ],
  hardDeps: ['compliance', 'risk'],
  softDeps: ['audit', 'incident', 'vendor', 'evidence'],
  navId: 'remediation',
  navChildCount: 8,
  workflowTemplateCode: 'remediation_tracking',
  workflowSlaHours: 168,
  automationLevel: 'full',
  agentBinding: 'A06',
  aiCapabilities: ['notes', 'drafts', 'recommendations', 'gate_checks'],
  aiEnabled: true,
  featureFlags: ['remediation.auto_tracking', 'remediation.ai_prioritization'],
  installable: true,
  provisioningOrder: 21,
  licensingTier: 'starter',
  visibility: 'both',
  adminSurfaces: ['remediation-templates', 'verification-config', 'sla-config'],

  securityPermissions: REMEDIATION_PERMISSIONS,
  securityRoles: REMEDIATION_ROLES,
  securityActions: REMEDIATION_ACTIONS,
  approvalRules: REMEDIATION_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'remediation_plan', ownerField: 'plan_owner', reviewerField: 'verifier', approverField: null, assigneeField: 'assignee', orgScopeField: 'department_id', defaultOwnerRole: 'remediation.module_lead', canDelegate: true, delegateRoles: ['remediation.operator'], canReassign: true, reassignRoles: ['remediation.module_lead', 'remediation.executive_owner'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'remediation_action', ownerField: 'assignee', reviewerField: 'verifier', approverField: null, assigneeField: 'assignee', orgScopeField: 'department_id', defaultOwnerRole: 'remediation.operator', canDelegate: true, delegateRoles: ['remediation.contributor'], canReassign: true, reassignRoles: ['remediation.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'team' },
  ],
  sodRules: [
    { ruleCode: 'remediation.sod.assignee_verifier', descriptionEn: 'Action assignee cannot verify their own remediation action', descriptionAr: 'لا يمكن للمكلف بالإجراء التحقق من إجراء المعالجة الخاص به', conflictingRoles: [], conflictingActions: ['remediation.action.complete', 'remediation.action.verify'], conflictingTransitions: ['in_progress->verified'], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['independent_verification'], overrideAuthority: ['remediation.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'remediation.sod.creator_closer', descriptionEn: 'Plan creator cannot close their own remediation plan', descriptionAr: 'لا يمكن لمنشئ الخطة إغلاق خطة المعالجة الخاصة به', conflictingRoles: [], conflictingActions: ['remediation.plan.create', 'remediation.plan.close'], conflictingTransitions: ['pending_verification->closed'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['manager_review'], overrideAuthority: ['remediation.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/remediation/services/remediation.service'
};

registerModule(REMEDIATION_MANIFEST);
