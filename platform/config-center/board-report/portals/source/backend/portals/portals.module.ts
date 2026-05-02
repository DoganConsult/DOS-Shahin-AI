import type { ModuleManifest, ModuleEventContract } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { PORTALS_EVENT_CONTRACT } from './events/portals.events';
import { PORTALS_PERMISSIONS, PORTALS_ROLES, PORTALS_ACTIONS } from './security/portals.security';
import { PORTALS_APPROVAL_MATRIX } from './security/portals.approval-matrix';

export const PORTALS_MODULE_CODE = 'portals' as const;
export const PORTALS_EVENTS: ModuleEventContract = PORTALS_EVENT_CONTRACT;

export const PORTALS_MANIFEST: ModuleManifest = {
  code: 'portals',
  version: '2.0.0',
  aliases: [],
  nameEn: 'External Portals',
  nameAr: 'البوابات الخارجية',
  descriptionEn: 'Regulator, consultant, and public explorer portals with configurable access and page management.',
  descriptionAr: 'بوابات الجهات التنظيمية والمستشارين والمستكشف العام مع إمكانية الوصول القابلة للتكوين وإدارة الصفحات.',
  tier: 'domain',
  category: 'advanced',
  routeBase: '/api/portals',
  eventNamespace: 'portals',
  tablePrefix: 'portal_',
  ownedTables: [
    'portal_configs', 'portal_users', 'portal_sessions',
    'portal_pages', 'portal_tokens', 'portal_invitations',
  ],
  sharedTables: [],
  referencedTables: ['teams', 'vendors', 'workflows'],
  aggregateRoots: ['portal_configs', 'portal_users', 'portal_sessions'],
  publishedEvents: Object.keys(PORTALS_EVENT_CONTRACT.published),
  consumedEvents: Object.keys(PORTALS_EVENT_CONTRACT.consumed),
  hardDeps: [],
  softDeps: ['vendor', 'workflow'],
  navId: 'portals',
  navChildCount: 4,
  workflowTemplateCode: 'portal_access_lifecycle',
  workflowSlaHours: 24,
  automationLevel: 'semi',
  agentBinding: null,
  aiCapabilities: ['recommendations'],
  aiEnabled: true,
  featureFlags: ['portals.regulator', 'portals.consultant', 'portals.public_explorer'],
  installable: true,
  provisioningOrder: 28,
  licensingTier: 'enterprise',
  visibility: 'external',
  adminSurfaces: ['portal-config', 'access-management', 'page-builder', 'token-management'],

  securityPermissions: PORTALS_PERMISSIONS,
  securityRoles: PORTALS_ROLES,
  securityActions: PORTALS_ACTIONS,
  approvalRules: PORTALS_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'portal_config', ownerField: 'created_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: null, defaultOwnerRole: 'portals.module_lead', canDelegate: false, delegateRoles: [], canReassign: true, reassignRoles: ['portals.module_lead'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'global' },
    { entityType: 'portal_invitation', ownerField: 'invited_by', reviewerField: null, approverField: 'access_approver', assigneeField: null, orgScopeField: null, defaultOwnerRole: 'portals.operator', canDelegate: false, delegateRoles: [], canReassign: false, reassignRoles: [], requiresApproval: true, creatorRights: 'full', externalVisible: true, rowLevelAccess: 'global' },
  ],
  sodRules: [
    { ruleCode: 'portals.sod.creator_access_grantor', descriptionEn: 'Portal creator cannot approve external access grants to their own portal', descriptionAr: 'لا يمكن لمنشئ البوابة الموافقة على منح الوصول الخارجي لبوابته', conflictingRoles: [], conflictingActions: ['portals.portal.create', 'portals.access.grant_external'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['security_review'], overrideAuthority: ['portals.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'portals.sod.token_issuer_revoker', descriptionEn: 'Portal token issuer cannot revoke tokens they issued', descriptionAr: 'لا يمكن لمصدر رمز البوابة إلغاء الرموز التي أصدرها', conflictingRoles: [], conflictingActions: ['portals.token.issue', 'portals.token.revoke'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['security_review'], overrideAuthority: ['portals.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/portals/services/portals.service'
};

registerModule(PORTALS_MANIFEST);
