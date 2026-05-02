import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { RISK_PERMISSIONS, RISK_ROLES, RISK_ACTIONS } from './security/risk.security.enterprise';
import { RISK_APPROVAL_MATRIX } from './security/risk.approval-matrix.enterprise';

export const RISK_MANIFEST: ModuleManifest = {
  code: 'risk',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Risk Management',
  nameAr: 'إدارة المخاطر',
  descriptionEn: 'Risk identification, assessment, treatment, KRI monitoring, and risk appetite management.',
  descriptionAr: 'تحديد المخاطر وتقييمها ومعالجتها ومراقبة مؤشرات المخاطر الرئيسية وإدارة شهية المخاطر.',
  tier: 'full',
  category: 'core_grc',
  routeBase: '/api/risk',
  eventNamespace: 'risk',
  tablePrefix: 'risk_',
  ownedTables: [
    'risk_assessments', 'risk_categories', 'risk_consequences', 'risk_dependencies',
    'risk_fair_assessments', 'risk_impact_scales', 'risk_kris', 'risk_likelihood_scales',
    'risk_owners', 'risk_pair_reviews', 'risk_scenarios', 'risk_score_history',
    'risk_scoring_models', 'risk_sector_applicability', 'risk_status_history',
    'risk_taxonomy', 'risk_team_distribution', 'risk_threats', 'risk_appetite_config',
    'risk_assessment_items', 'risk_assessment_responses', 'risk_assessment_reviews',
    'risk_campaigns', 'risk_indicator_templates', 'risk_scenario_reviews',
    'risk_treatment_reviews', 'risk_dashboard_cache',
  ],
  sharedTables: ['risk_appetite_statements', 'risk_asset_links', 'risk_compliance_links', 'risk_evidence_links', 'risk_policy_links', 'risk_vendor_links'],
  referencedTables: ['audit_trail', 'teams', 'workflows', 'assets', 'compliance_frameworks'],
  aggregateRoots: ['risk_assessments', 'risk_scenarios', 'risk_kris', 'risk_appetite_config'],
  publishedEvents: [
    'risk.created', 'risk.assessment_completed', 'risk.score_changed',
    'risk.inherent_score_changed', 'risk.residual_high', 'risk.risk_accepted',
    'risk.status_changed', 'risk.treatment_overdue', 'risk.treatment_updated',
    'risk.appetite_breached', 'risk.kri_threshold_breached',
  ],
  consumedEvents: [
    'compliance.gap_detected', 'vendor.risk_changed', 'asset.classified',
    'incident.classified', 'audit.finding_created', 'workflow.status_changed',
  ],
  hardDeps: ['compliance', 'evidence'],
  softDeps: ['policy', 'vendor', 'asset', 'incident', 'audit'],
  navId: 'risk',
  navChildCount: 16,
  workflowTemplateCode: 'risk_assessment_cycle',
  workflowSlaHours: 168,
  automationLevel: 'semi',
  agentBinding: 'A01',
  aiCapabilities: ['notes', 'drafts', 'recommendations', 'gate_checks', 'health_monitor'],
  aiEnabled: true,
  featureFlags: ['risk.bowtie', 'risk.fair', 'risk.digital_twin'],
  installable: true,
  provisioningOrder: 11,
  licensingTier: 'starter',
  visibility: 'both',
  adminSurfaces: ['risk-scoring-models', 'risk-taxonomy', 'risk-appetite-config', 'kri-thresholds'],

  securityPermissions: RISK_PERMISSIONS,
  securityRoles: RISK_ROLES,
  securityActions: RISK_ACTIONS,
  approvalRules: RISK_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'risk_assessments', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assessor_id', orgScopeField: 'department_id', defaultOwnerRole: 'risk.module_lead', canDelegate: true, delegateRoles: ['risk.operator', 'risk.contributor'], canReassign: true, reassignRoles: ['risk.module_lead', 'risk.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'risk_appetite_config', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'risk.module_lead', canDelegate: true, delegateRoles: ['risk.operator', 'risk.contributor'], canReassign: true, reassignRoles: ['risk.module_lead', 'risk.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'risk_kris', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'risk.module_lead', canDelegate: true, delegateRoles: ['risk.operator', 'risk.contributor'], canReassign: true, reassignRoles: ['risk.module_lead', 'risk.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
  ],
  sodRules: [
    { ruleCode: 'risk.sod.assessor_approver', descriptionEn: 'Risk assessor cannot approve their own assessment', descriptionAr: 'لا يمكن لمقيّم المخاطر الموافقة على تقييمه', conflictingRoles: [], conflictingActions: ['risk.assessment.conduct', 'risk.assessment.approve'], conflictingTransitions: ['in_progress->completed'], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['independent_review'], overrideAuthority: ['risk.executive_owner'], auditObligations: ['log_sod_violation', 'notify_compliance_team'] },
    { ruleCode: 'risk.sod.risk_owner_mitigator', descriptionEn: 'Risk owner cannot approve mitigation of their own risk', descriptionAr: 'لا يمكن لمالك المخاطر الموافقة على تخفيف مخاطره', conflictingRoles: [], conflictingActions: ['risk.risk.own', 'risk.mitigation.approve'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['manager_review'], overrideAuthority: ['risk.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/risk/services/core/risk.service'
};

registerModule(RISK_MANIFEST);
