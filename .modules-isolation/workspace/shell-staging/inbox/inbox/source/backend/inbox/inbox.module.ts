import type { ModuleManifest, ModuleEventContract } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { INBOX_EVENT_CONTRACT } from './events/inbox.events';
import { INBOX_PERMISSIONS, INBOX_ROLES, INBOX_ACTIONS } from './security/inbox.security';
import { INBOX_APPROVAL_MATRIX } from './security/inbox.approval-matrix';

export const INBOX_MODULE_CODE = 'inbox' as const;
export const INBOX_EVENTS: ModuleEventContract = INBOX_EVENT_CONTRACT;

export const INBOX_MANIFEST: ModuleManifest = {
  code: 'inbox',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Inbox',
  nameAr: 'صندوق الوارد',
  descriptionEn: 'Internal messaging, broadcasts, and smart priority inbox for GRC communications.',
  descriptionAr: 'المراسلة الداخلية والبث الجماعي وصندوق الأولويات الذكي للاتصالات.',
  tier: 'platform',
  category: 'platform',
  routeBase: '/api/inbox',
  eventNamespace: 'inbox',
  tablePrefix: 'inbox_',
  ownedTables: [
    'inbox_messages', 'inbox_threads', 'inbox_templates',
    'inbox_read_receipts', 'inbox_broadcasts', 'inbox_preferences',
  ],
  sharedTables: [],
  referencedTables: ['notifications', 'teams', 'workflows'],
  aggregateRoots: ['inbox_messages', 'inbox_threads', 'inbox_broadcasts'],
  publishedEvents: Object.keys(INBOX_EVENT_CONTRACT.published),
  consumedEvents: Object.keys(INBOX_EVENT_CONTRACT.consumed),
  hardDeps: ['notification'],
  softDeps: ['workflow', 'governance', 'incident', 'compliance'],
  navId: 'inbox',
  navChildCount: 3,
  workflowTemplateCode: 'inbox_broadcast_approval',
  workflowSlaHours: 24,
  automationLevel: 'full',
  agentBinding: 'A13',
  aiCapabilities: ['notes', 'drafts'],
  aiEnabled: true,
  featureFlags: ['inbox.digest', 'inbox.smart_priority'],
  installable: true,
  provisioningOrder: 9,
  licensingTier: 'starter',
  visibility: 'internal',
  adminSurfaces: ['inbox-templates', 'broadcast-config'],

  securityPermissions: INBOX_PERMISSIONS,
  securityRoles: INBOX_ROLES,
  securityActions: INBOX_ACTIONS,
  approvalRules: INBOX_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'inbox_broadcast', ownerField: 'sender', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: null, defaultOwnerRole: 'inbox.operator', canDelegate: false, delegateRoles: [], canReassign: false, reassignRoles: [], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'global' },
    { entityType: 'inbox_message', ownerField: 'sender', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: null, defaultOwnerRole: 'inbox.contributor', canDelegate: false, delegateRoles: [], canReassign: false, reassignRoles: [], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'owner_only' },
  ],
  sodRules: [
    { ruleCode: 'inbox.sod.broadcast_approver', descriptionEn: 'Broadcast sender cannot approve their own org-wide broadcast', descriptionAr: 'لا يمكن لمرسل البث الموافقة على بثه على مستوى المنظمة', conflictingRoles: [], conflictingActions: ['inbox.broadcast.create', 'inbox.broadcast.approve_org'], conflictingTransitions: [], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 90, compensatingControls: ['admin_review'], overrideAuthority: ['inbox.module_lead'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'inbox.sod.template_editor_activator', descriptionEn: 'Template editor cannot activate their own message template', descriptionAr: 'لا يمكن لمحرر القالب تفعيل قالب رسائله', conflictingRoles: [], conflictingActions: ['inbox.template.edit', 'inbox.template.activate'], conflictingTransitions: [], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 90, compensatingControls: ['admin_review'], overrideAuthority: ['inbox.module_lead'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/inbox/services/inbox.service'
};

registerModule(INBOX_MANIFEST);
