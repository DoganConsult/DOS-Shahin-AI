import type { ModuleManifest, ModuleEventContract } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { PRIVACY_EVENT_CONTRACT } from './events/privacy.events';
import { PRIVACY_PERMISSIONS, PRIVACY_ROLES, PRIVACY_ACTIONS } from './security/privacy.security';
import { PRIVACY_APPROVAL_MATRIX } from './security/privacy.approval-matrix';

export const PRIVACY_MODULE_CODE = 'privacy' as const;
export const PRIVACY_EVENTS: ModuleEventContract = PRIVACY_EVENT_CONTRACT;

export const PRIVACY_MANIFEST: ModuleManifest = {
  code: 'privacy',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Privacy Management',
  nameAr: 'إدارة الخصوصية',
  descriptionEn: 'Data subject requests, privacy impact assessments, consent records, data maps, and breach handling.',
  descriptionAr: 'طلبات أصحاب البيانات وتقييمات تأثير الخصوصية وسجلات الموافقة وخرائط البيانات ومعالجة الانتهاكات.',
  tier: 'full',
  category: 'core_grc',
  routeBase: '/api/privacy',
  eventNamespace: 'privacy',
  tablePrefix: 'privacy_',
  ownedTables: [
    'privacy_dsrs', 'privacy_pia', 'privacy_consent_records',
    'privacy_data_maps', 'privacy_breach_records', 'privacy_transfer_impact',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'compliance_frameworks', 'incidents', 'vendors'],
  aggregateRoots: ['privacy_dsrs', 'privacy_pia', 'privacy_data_maps', 'privacy_consent_records'],
  publishedEvents: Object.keys(PRIVACY_EVENT_CONTRACT.published),
  consumedEvents: Object.keys(PRIVACY_EVENT_CONTRACT.consumed),
  hardDeps: ['compliance'],
  softDeps: ['incident', 'vendor', 'policy', 'workflow'],
  navId: 'privacy',
  navChildCount: 6,
  workflowTemplateCode: 'dsr_processing_cycle',
  workflowSlaHours: 720,
  automationLevel: 'semi',
  agentBinding: 'A16',
  aiCapabilities: ['notes', 'recommendations', 'gate_checks', 'health_monitor'],
  aiEnabled: true,
  featureFlags: ['privacy.pdpl', 'privacy.gdpr', 'privacy.ccpa', 'privacy.cross_border'],
  installable: true,
  provisioningOrder: 30,
  licensingTier: 'enterprise',
  visibility: 'both',
  adminSurfaces: ['privacy-config', 'dsr-templates', 'consent-settings', 'breach-thresholds'],

  securityPermissions: PRIVACY_PERMISSIONS,
  securityRoles: PRIVACY_ROLES,
  securityActions: PRIVACY_ACTIONS,
  approvalRules: PRIVACY_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'privacy_dsr', ownerField: 'dpo', reviewerField: null, approverField: 'dpo', assigneeField: 'processor', orgScopeField: 'department_id', defaultOwnerRole: 'privacy.module_lead', canDelegate: true, delegateRoles: ['privacy.operator'], canReassign: true, reassignRoles: ['privacy.module_lead'], requiresApproval: true, creatorRights: 'read_only', externalVisible: true, rowLevelAccess: 'org' },
    { entityType: 'privacy_pia', ownerField: 'conductor', reviewerField: 'reviewer', approverField: 'dpo', assigneeField: null, orgScopeField: 'department_id', defaultOwnerRole: 'privacy.operator', canDelegate: true, delegateRoles: ['privacy.contributor'], canReassign: true, reassignRoles: ['privacy.module_lead'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
  ],
  sodRules: [
    { ruleCode: 'privacy.sod.processor_approver', descriptionEn: 'DSR processor cannot approve their own DSR completion', descriptionAr: 'لا يمكن لمعالج طلب البيانات الموافقة على إتمام طلبه', conflictingRoles: [], conflictingActions: ['privacy.dsr.process', 'privacy.dsr.approve_completion'], conflictingTransitions: ['processing->completed'], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['dpo_review'], overrideAuthority: ['privacy.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'privacy.sod.pia_conductor_approver', descriptionEn: 'PIA conductor cannot approve their own PIA', descriptionAr: 'لا يمكن لمجري تقييم تأثير الخصوصية الموافقة على تقييمه', conflictingRoles: [], conflictingActions: ['privacy.pia.conduct', 'privacy.pia.approve'], conflictingTransitions: ['under_review->approved'], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['independent_review'], overrideAuthority: ['privacy.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/privacy/services/misc/privacy.service'
};

registerModule(PRIVACY_MANIFEST);
