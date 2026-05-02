import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { POLICY_PERMISSIONS, POLICY_ROLES, POLICY_ACTIONS } from './security/policy.security';
import { POLICY_APPROVAL_MATRIX } from './security/policy.approval-matrix';

export const POLICY_MANIFEST: ModuleManifest = {
  code: 'policy',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Policy Management',
  nameAr: 'إدارة السياسات',
  descriptionEn: 'Policy lifecycle management, review cycles, exception handling, and acknowledgement tracking.',
  descriptionAr: 'إدارة دورة حياة السياسات ودورات المراجعة ومعالجة الاستثناءات وتتبع الإقرارات.',
  tier: 'full',
  category: 'governance',
  routeBase: '/api/policy',
  eventNamespace: 'policy',
  tablePrefix: 'policy_',
  ownedTables: [
    'policy_categories', 'policy_control_links', 'policy_dashboard_cache',
    'policy_decision_log', 'policy_delivery_records', 'policy_drift_events',
    'policy_drift_snapshots', 'policy_exception_approvals', 'policy_exception_requests',
    'policy_assessment_history', 'policy_rule', 'policy_scope_rules',
    'policy_acknowledgements', 'policy_review_cycles', 'policy_versions',
    'policy_change_requests', 'policy_impact_assessments', 'policy_templates',
    'policy_distribution_lists', 'policy_compliance_mappings', 'policy_hierarchy',
    'policy_effectiveness_metrics', 'policy_attestation_records', 'policy_gap_analysis',
    'policy_remediation_plans', 'policy_audit_log', 'policy_notifications',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams', 'workflows', 'compliance_frameworks', 'governance_charters'],
  aggregateRoots: ['policy_rule', 'policy_versions', 'policy_review_cycles', 'policy_exception_requests'],
  publishedEvents: [
    'policy.created', 'policy.approved', 'policy.published', 'policy.rejected',
    'policy.expired', 'policy.revoked', 'policy.version_created', 'policy.review_due',
    'policy.review_started', 'policy.exception_approved', 'policy.exception_rejected',
    'policy.acknowledgement_required', 'policy.acknowledgement_received',
    'policy.drift_detected',
  ],
  consumedEvents: [
    'compliance.framework_mapping_updated', 'governance.charter_approved',
    'risk.assessment_completed', 'workflow.status_changed',
    'team.structure_changed', 'onboarding.completed',
    'workflow.instance_completed', 'dora.obligation_created',
    'governance_ai.signal_detected', 'dashboard.widget_created',
    'navigation.item_updated',
  ],
  hardDeps: ['governance'],
  softDeps: ['compliance', 'evidence', 'risk', 'audit', 'workflow', 'team', 'onboarding', 'dora', 'governance-ai', 'dashboard', 'navigation'] as any,
  navId: 'governance',
  navChildCount: 0,
  workflowTemplateCode: 'policy_review_cycle',
  workflowSlaHours: 336,
  automationLevel: 'semi',
  agentBinding: 'A04',
  aiCapabilities: ['notes', 'drafts', 'recommendations', 'gate_checks'],
  aiEnabled: true,
  featureFlags: ['policy.impact_assessment', 'policy.ai_drafting'],
  installable: true,
  provisioningOrder: 12,
  licensingTier: 'starter',
  visibility: 'both',
  adminSurfaces: ['policy-templates', 'review-cycle-config', 'distribution-lists', 'effectiveness-metrics'],

  securityPermissions: POLICY_PERMISSIONS,
  securityRoles: POLICY_ROLES,
  securityActions: POLICY_ACTIONS,
  approvalRules: POLICY_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'policy_rule', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: null, orgScopeField: 'department_id', defaultOwnerRole: 'policy.module_lead', canDelegate: true, delegateRoles: ['policy.operator', 'policy.contributor'], canReassign: true, reassignRoles: ['policy.module_lead', 'policy.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'policy_review_cycles', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'policy.module_lead', canDelegate: true, delegateRoles: ['policy.operator', 'policy.contributor'], canReassign: true, reassignRoles: ['policy.module_lead', 'policy.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'policy_exception_requests', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'policy.module_lead', canDelegate: true, delegateRoles: ['policy.operator', 'policy.contributor'], canReassign: true, reassignRoles: ['policy.module_lead', 'policy.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
  ],
  sodRules: [
    { ruleCode: 'policy.sod.drafter_approver', descriptionEn: 'Policy drafter cannot approve their own policy', descriptionAr: 'لا يمكن لصائغ السياسة الموافقة على سياسته', conflictingRoles: [], conflictingActions: ['policy.policy.draft', 'policy.policy.approve'], conflictingTransitions: ['draft->approved'], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['committee_review'], overrideAuthority: ['policy.executive_owner'], auditObligations: ['log_sod_violation', 'notify_compliance_team'] },
    { ruleCode: 'policy.sod.reviewer_publisher', descriptionEn: 'Policy reviewer cannot publish the policy they reviewed', descriptionAr: 'لا يمكن لمراجع السياسة نشر السياسة التي راجعها', conflictingRoles: [], conflictingActions: ['policy.policy.review', 'policy.policy.publish'], conflictingTransitions: ['approved->published'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: true, waiverMaxDays: 14, compensatingControls: ['executive_sign_off'], overrideAuthority: ['policy.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/policy/services/policy-lifecycle.service'
};

registerModule(POLICY_MANIFEST);
