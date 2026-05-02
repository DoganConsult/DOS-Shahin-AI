import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { EXCEPTION_PERMISSIONS, EXCEPTION_ROLES, EXCEPTION_ACTIONS } from './security/exception.security';
import { EXCEPTION_APPROVAL_MATRIX } from './security/exception.approval-matrix';

export const EXCEPTION_MANIFEST: ModuleManifest = {
  code: 'exception',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Exceptions',
  nameAr: 'الاستثناءات',
  descriptionEn: 'Policy exception requests, approvals, expiry tracking, and compensating controls.',
  descriptionAr: 'طلبات استثناء السياسات والموافقات وتتبع انتهاء الصلاحية والضوابط التعويضية.',
  tier: 'full',
  category: 'governance',
  routeBase: '/api/exception',
  eventNamespace: 'exception',
  tablePrefix: 'exception_',
  ownedTables: [
    'exceptions', 'exception_approvals', 'exception_renewals',
    'exception_justifications', 'exception_compensating_controls',
    'exception_risk_links', 'exception_status_history',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams', 'workflows', 'compliance_frameworks', 'risk_assessments'],
  aggregateRoots: ['exceptions'],
  publishedEvents: [
    'exception.requested', 'exception.approved', 'exception.rejected',
    'exception.expired', 'exception.extended', 'exception.compensating_control_assigned',
    'exception.compensating_control_removed', 'exception.effectiveness_updated',
    'exception.justification_updated', 'exception.risk_accepted', 'exception.review_due',
  ],
  consumedEvents: [
    'compliance.gap_detected', 'risk.score_changed',
    'policy.approved', 'workflow.status_changed',
  ],
  hardDeps: ['governance', 'compliance'],
  softDeps: ['risk', 'policy', 'audit'],
  navId: 'governance',
  navChildCount: 0,
  workflowTemplateCode: 'exception_approval',
  workflowSlaHours: 168,
  automationLevel: 'semi',
  agentBinding: 'A04',
  aiCapabilities: ['notes', 'drafts', 'recommendations', 'gate_checks'],
  aiEnabled: true,
  featureFlags: ['exception.auto_expiry', 'exception.risk_scoring'],
  installable: true,
  provisioningOrder: 17,
  licensingTier: 'professional',
  visibility: 'both',
  adminSurfaces: ['exception-approval-config', 'exception-expiry-settings'],

  securityPermissions: EXCEPTION_PERMISSIONS,
  securityRoles: EXCEPTION_ROLES,
  securityActions: EXCEPTION_ACTIONS,
  approvalRules: EXCEPTION_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'exception_request', ownerField: 'requester', reviewerField: 'reviewer', approverField: 'approver', assigneeField: null, orgScopeField: 'department_id', defaultOwnerRole: 'exception.contributor', canDelegate: true, delegateRoles: ['exception.operator'], canReassign: true, reassignRoles: ['exception.module_lead'], requiresApproval: true, creatorRights: 'read_only', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'exception_approvals', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'exception.module_lead', canDelegate: true, delegateRoles: ['exception.operator', 'exception.contributor'], canReassign: true, reassignRoles: ['exception.module_lead', 'exception.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'exception_renewals', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'exception.module_lead', canDelegate: true, delegateRoles: ['exception.operator', 'exception.contributor'], canReassign: true, reassignRoles: ['exception.module_lead', 'exception.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
  ],
  sodRules: [
    { ruleCode: 'exception.sod.requester_approver', descriptionEn: 'Exception requester cannot approve their own exception', descriptionAr: 'لا يمكن لطالب الاستثناء الموافقة على استثنائه', conflictingRoles: [], conflictingActions: ['exception.request.create', 'exception.request.approve'], conflictingTransitions: ['submitted->approved'], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['senior_management_review'], overrideAuthority: ['exception.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'exception.sod.requester_risk_acceptor', descriptionEn: 'Exception requester cannot accept risk for their own exception', descriptionAr: 'لا يمكن لطالب الاستثناء قبول المخاطر لاستثنائه', conflictingRoles: [], conflictingActions: ['exception.request.create', 'exception.risk.accept'], conflictingTransitions: [], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['risk_committee_review'], overrideAuthority: ['exception.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'exception.sod.approver_renewer', descriptionEn: 'Exception approver cannot renew the same exception', descriptionAr: 'لا يمكن لمعتمد الاستثناء تجديد نفس الاستثناء', conflictingRoles: [], conflictingActions: ['exception.request.approve', 'exception.request.renew'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['compliance_review'], overrideAuthority: ['exception.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/exception/services/exception.service'
};

registerModule(EXCEPTION_MANIFEST);
