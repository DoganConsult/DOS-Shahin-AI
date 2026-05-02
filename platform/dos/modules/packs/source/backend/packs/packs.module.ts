import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { PACKS_PERMISSIONS, PACKS_ROLES, PACKS_ACTIONS } from './security/packs.security';
import { PACKS_APPROVAL_MATRIX } from './security/packs.approval-matrix';
import { PACKS_PUBLISHED_EVENTS, PACKS_CONSUMED_EVENTS } from './events/packs.events';

export const PACKS_MANIFEST: ModuleManifest = {
  code: 'packs',
  version: '2.0.0',
  aliases: ['pack-manager', 'content-packs'],
  nameEn: 'Packs',
  nameAr: 'الحزم',
  descriptionEn: 'Pack registry, installation, compatibility, and policy management for pre-built compliance and governance content packs. Includes AI-powered recommendations and impact analysis.',
  descriptionAr: 'سجل الحزم والتثبيت والتوافق وإدارة السياسات لحزم المحتوى الجاهزة للامتثال والحوكمة. يتضمن توصيات ذكية وتحليل التأثير.',
  tier: 'platform',
  category: 'platform',
  routeBase: '/api/packs',
  eventNamespace: 'packs',
  tablePrefix: 'pack_',
  ownedTables: [
    'pack_installations', 'pack_registry', 'pack_policies',
    'pack_versions', 'pack_dependencies', 'pack_selection_policies',
    'pack_selection_decisions', 'pack_artifacts',
    'tenant_pack_installations',
  ],
  sharedTables: [],
  referencedTables: ['tenants', 'modules', 'module_settings', 'onboarding_sessions', 'onboarding_answers', 'onboarding_recommendations'],
  aggregateRoots: ['pack_installations', 'pack_registry'],
  publishedEvents: PACKS_PUBLISHED_EVENTS,
  consumedEvents: PACKS_CONSUMED_EVENTS,
  hardDeps: [],
  softDeps: ['compliance', 'policy', 'risk'],
  navId: 'packs',
  navChildCount: 2,
  workflowTemplateCode: 'pack_installation_approval',
  workflowSlaHours: 72,
  automationLevel: 'semi',
  agentBinding: null,
  aiCapabilities: ['recommendations'],
  aiEnabled: true,
  featureFlags: ['packs.auto_update'],
  installable: false,
  provisioningOrder: 3,
  licensingTier: 'starter',
  visibility: 'internal',
  adminSurfaces: ['pack-registry', 'pack-policy-config'],

  securityPermissions: PACKS_PERMISSIONS,
  securityRoles: PACKS_ROLES,
  securityActions: PACKS_ACTIONS,
  approvalRules: PACKS_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'pack_installations', ownerField: 'installed_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'packs.module_lead', canDelegate: false, delegateRoles: [], canReassign: false, reassignRoles: [], requiresApproval: true, creatorRights: 'read_only', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'pack_registry', ownerField: 'created_by', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'packs.module_lead', canDelegate: true, delegateRoles: ['packs.operator'], canReassign: true, reassignRoles: ['packs.module_lead', 'packs.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'packs.sod.installer_approver', descriptionEn: 'Pack installer cannot approve their own installation', descriptionAr: 'لا يمكن لمثبت الحزمة الموافقة على تثبيته', conflictingRoles: [], conflictingActions: ['packs.pack.install', 'packs.pack.approve'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['admin_review'], overrideAuthority: ['packs.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'packs.sod.publisher_installer', descriptionEn: 'Pack publisher cannot install their own published pack', descriptionAr: 'لا يمكن لناشر الحزمة تثبيت حزمته المنشورة', conflictingRoles: [], conflictingActions: ['packs.pack.publish', 'packs.pack.install'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['admin_review'], overrideAuthority: ['packs.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
};

registerModule(PACKS_MANIFEST);
