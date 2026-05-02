import type { ModuleManifest, ModuleEventContract } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { RECORDS_EVENT_CONTRACT } from './events/records.events';
import { RECORDS_PERMISSIONS, RECORDS_ROLES, RECORDS_ACTIONS } from './security/records.security';
import { RECORDS_APPROVAL_MATRIX } from './security/records.approval-matrix';

export const RECORDS_MODULE_CODE = 'records' as const;
export const RECORDS_EVENTS: ModuleEventContract = RECORDS_EVENT_CONTRACT;

export const RECORDS_MANIFEST: ModuleManifest = {
  code: 'records',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Records Management',
  nameAr: 'إدارة السجلات',
  descriptionEn: 'Document records, retention policies, legal holds, classification, and disposal management.',
  descriptionAr: 'سجلات الوثائق وسياسات الاحتفاظ والحجوزات القانونية والتصنيف وإدارة التخلص.',
  tier: 'domain',
  category: 'operational',
  routeBase: '/api/records',
  eventNamespace: 'records',
  tablePrefix: 'record_',
  ownedTables: [
    'records', 'record_versions', 'record_retention_policies',
    'record_classifications', 'record_holds', 'record_disposals',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'compliance_frameworks', 'policies'],
  aggregateRoots: ['records', 'record_retention_policies', 'record_classifications', 'record_holds'],
  publishedEvents: Object.keys(RECORDS_EVENT_CONTRACT.published),
  consumedEvents: Object.keys(RECORDS_EVENT_CONTRACT.consumed),
  hardDeps: [],
  softDeps: ['compliance', 'policy', 'audit', 'workflow'],
  navId: 'records',
  navChildCount: 4,
  workflowTemplateCode: 'records_retention_cycle',
  workflowSlaHours: 720,
  automationLevel: 'semi',
  agentBinding: null,
  aiCapabilities: ['recommendations', 'gate_checks'],
  aiEnabled: true,
  featureFlags: ['records.auto_classification', 'records.legal_hold'],
  installable: true,
  provisioningOrder: 29,
  licensingTier: 'professional',
  visibility: 'both',
  adminSurfaces: ['retention-policies', 'classification-rules', 'legal-hold-config', 'disposal-schedules'],

  securityPermissions: RECORDS_PERMISSIONS,
  securityRoles: RECORDS_ROLES,
  securityActions: RECORDS_ACTIONS,
  approvalRules: RECORDS_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'record', ownerField: 'records_custodian', reviewerField: 'reviewer', approverField: null, assigneeField: null, orgScopeField: 'department_id', defaultOwnerRole: 'records.module_lead', canDelegate: true, delegateRoles: ['records.operator'], canReassign: true, reassignRoles: ['records.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'record_hold', ownerField: 'hold_issuer', reviewerField: null, approverField: 'hold_approver', assigneeField: null, orgScopeField: null, defaultOwnerRole: 'records.module_lead', canDelegate: false, delegateRoles: [], canReassign: false, reassignRoles: [], requiresApproval: true, creatorRights: 'read_only', externalVisible: false, rowLevelAccess: 'global' },
  ],
  sodRules: [
    { ruleCode: 'records.sod.creator_disposer', descriptionEn: 'Record creator cannot approve disposal of their own records', descriptionAr: 'لا يمكن لمنشئ السجل الموافقة على التخلص من سجلاته', conflictingRoles: [], conflictingActions: ['records.record.create', 'records.disposal.approve'], conflictingTransitions: ['active->disposed'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['legal_review'], overrideAuthority: ['records.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'records.sod.hold_placer_releaser', descriptionEn: 'Legal hold placer cannot release their own hold', descriptionAr: 'لا يمكن لواضع الحجز القانوني إلغاء حجزه', conflictingRoles: [], conflictingActions: ['records.hold.place', 'records.hold.release'], conflictingTransitions: [], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: [], overrideAuthority: ['records.executive_owner'], auditObligations: ['log_sod_violation', 'notify_legal'] },
  ],
    mcpServiceEntrypoint: 'modules/records/services/records.service'
};

registerModule(RECORDS_MANIFEST);
