import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { KSA_REGULATORY_PERMISSIONS, KSA_REGULATORY_ROLES, KSA_REGULATORY_ACTIONS } from './security/ksa-regulatory.security';
import { KSA_REGULATORY_APPROVAL_MATRIX } from './security/ksa-regulatory.approval-matrix';

export const KSA_REGULATORY_MANIFEST: ModuleManifest = {
  code: 'ksa-regulatory',
  version: '1.0.0',
  aliases: [],
  nameEn: 'KSA Regulatory Intelligence',
  nameAr: 'الذكاء التنظيمي السعودي',
  descriptionEn: 'KSA regulatory intelligence, change tracking, cross-framework mapping, sector maturity, and compliance scoring.',
  descriptionAr: 'الذكاء التنظيمي السعودي وتتبع التغييرات وربط الأطر والنضج القطاعي وتسجيل الامتثال.',
  tier: 'domain',
  category: 'core_grc',
  routeBase: '/api/ksa-regulatory',
  eventNamespace: 'ksa_regulatory',
  tablePrefix: 'ksa_regulatory_',
  ownedTables: [
    'ksa_regulatory_readiness_snapshots',
  ],
  sharedTables: [
    'obligations',
    'frameworks',
    'controls',
    'control_mappings',
    'regulatory_changes',
  ],
  referencedTables: [
    'compliance_frameworks',
    'regulatory_controls',
    'evidence_evidences',
    'public.lookup_ksa_regulatory_authorities',
    'public.regulatory_frameworks',
    'public.regulatory_changes',
  ],
  aggregateRoots: ['ksa_regulatory_readiness_snapshots', 'obligations'],
  publishedEvents: [
    'ksa_regulatory.change_detected',
    'ksa_regulatory.maturity_scored',
    'ksa_regulatory.mapping_updated',
    'ksa_regulatory.obligation_status_updated',
  ],
  consumedEvents: ['compliance.assessment_completed'],
  hardDeps: ['compliance'],
  softDeps: ['risk', 'policy'],
  navId: 'ksa-regulatory',
  navChildCount: 4,
  workflowTemplateCode: 'ksa_regulatory_change_review',
  workflowSlaHours: 336,
  automationLevel: 'semi',
  agentBinding: 'A14',
  aiCapabilities: ['recommendations', 'classification', 'scoring'],
  aiEnabled: true,
  featureFlags: ['ksa_regulatory.change_tracking', 'ksa_regulatory.sector_maturity'],
  installable: true,
  provisioningOrder: 30,
  licensingTier: 'professional',
  visibility: 'internal',
  adminSurfaces: ['framework-mapping-config'],

  securityPermissions: KSA_REGULATORY_PERMISSIONS,
  securityRoles: KSA_REGULATORY_ROLES,
  securityActions: KSA_REGULATORY_ACTIONS,
  approvalRules: KSA_REGULATORY_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'ksa_regulatory_obligation', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: null, assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'ksa-regulatory.module_lead', canDelegate: true, delegateRoles: ['ksa-regulatory.operator',], canReassign: true, reassignRoles: ['ksa-regulatory.module_lead', 'ksa-regulatory.executive_owner'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'ksa_regulatory_readiness_snapshots', ownerField: 'generated_by', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: null, orgScopeField: 'department_id', defaultOwnerRole: 'ksa-regulatory.module_lead', canDelegate: true, delegateRoles: ['ksa-regulatory.operator'], canReassign: true, reassignRoles: ['ksa-regulatory.module_lead', 'ksa-regulatory.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
  ],
  sodRules: [
    { ruleCode: 'ksa_regulatory.sod.assessor_approver', descriptionEn: 'Readiness assessor cannot approve their own assessment', descriptionAr: 'لا يمكن لمقيّم الجاهزية الموافقة على تقييمه', conflictingRoles: [], conflictingActions: ['ksa_regulatory.readiness.assess', 'ksa_regulatory.readiness.approve'], conflictingTransitions: [], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['compliance_review'], overrideAuthority: ['ksa-regulatory.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'ksa_regulatory.sod.mapper_publisher', descriptionEn: 'Regulatory mapper cannot publish their own mapping updates', descriptionAr: 'لا يمكن لمعد الخرائط التنظيمية نشر تحديثات خرائطه', conflictingRoles: [], conflictingActions: ['ksa_regulatory.mapping.update', 'ksa_regulatory.mapping.publish'], conflictingTransitions: ['draft->published'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['compliance_review'], overrideAuthority: ['ksa-regulatory.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
};

registerModule(KSA_REGULATORY_MANIFEST);
