import type { ModuleManifest, ModuleEventContract } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { ISSUES_EVENT_CONTRACT } from './events/issues.events';
import { ISSUES_PERMISSIONS, ISSUES_ROLES, ISSUES_ACTIONS } from './security/issues.security';
import { ISSUES_APPROVAL_MATRIX } from './security/issues.approval-matrix';

export const ISSUES_MODULE_CODE = 'issues' as const;
export const ISSUES_EVENTS: ModuleEventContract = ISSUES_EVENT_CONTRACT;

export const ISSUES_MANIFEST: ModuleManifest = {
  code: 'issues',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Issues',
  nameAr: 'المسائل',
  descriptionEn: 'Cross-module issue tracking, SLA management, and link management to GRC entities.',
  descriptionAr: 'تتبع المسائل عبر الوحدات وإدارة مستوى الخدمة وإدارة الروابط لكيانات الحوكمة والمخاطر والامتثال.',
  tier: 'full',
  category: 'operational',
  routeBase: '/api/issues',
  eventNamespace: 'issues',
  tablePrefix: 'issue_',
  ownedTables: [
    'issues', 'issue_comments', 'issue_links', 'issue_history',
    'issue_tags', 'issue_watchers', 'issue_attachments',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams', 'workflows', 'risks', 'compliance_frameworks'],
  aggregateRoots: ['issues', 'issue_links', 'issue_history'],
  publishedEvents: Object.keys(ISSUES_EVENT_CONTRACT.published),
  consumedEvents: Object.keys(ISSUES_EVENT_CONTRACT.consumed),
  hardDeps: [],
  softDeps: ['compliance', 'audit', 'risk', 'incident', 'vendor'],
  navId: 'issues',
  navChildCount: 5,
  workflowTemplateCode: 'issue_resolution_cycle',
  workflowSlaHours: 72,
  automationLevel: 'semi',
  agentBinding: null,
  aiCapabilities: ['notes', 'recommendations'],
  aiEnabled: true,
  featureFlags: ['issues.auto_link', 'issues.sla_tracking'],
  installable: true,
  provisioningOrder: 27,
  licensingTier: 'starter',
  visibility: 'both',
  adminSurfaces: ['issue-categories', 'sla-config', 'auto-link-rules'],

  securityPermissions: ISSUES_PERMISSIONS,
  securityRoles: ISSUES_ROLES,
  securityActions: ISSUES_ACTIONS,
  approvalRules: ISSUES_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'issue', ownerField: 'reporter', reviewerField: null, approverField: null, assigneeField: 'assignee', orgScopeField: 'department_id', defaultOwnerRole: 'issues.contributor', canDelegate: true, delegateRoles: ['issues.operator'], canReassign: true, reassignRoles: ['issues.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'team' },
    { entityType: 'issue_findings', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'issues.module_lead', canDelegate: true, delegateRoles: ['issues.operator', 'issues.contributor'], canReassign: true, reassignRoles: ['issues.module_lead', 'issues.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
  ],
  sodRules: [
    { ruleCode: 'issues.sod.reporter_closer', descriptionEn: 'Issue reporter cannot close their own issue', descriptionAr: 'لا يمكن للمبلغ عن المسألة إغلاق مسألته', conflictingRoles: [], conflictingActions: ['issues.issue.create', 'issues.issue.close'], conflictingTransitions: ['open->closed'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['manager_review'], overrideAuthority: ['issues.module_lead'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'issues.sod.assignee_verifier', descriptionEn: 'Issue assignee cannot verify their own resolution', descriptionAr: 'لا يمكن للمكلف بالمسألة التحقق من حله', conflictingRoles: [], conflictingActions: ['issues.issue.resolve', 'issues.issue.verify'], conflictingTransitions: ['resolved->verified'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['peer_review'], overrideAuthority: ['issues.module_lead'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/issues/services/issues.service'
};

registerModule(ISSUES_MANIFEST);
