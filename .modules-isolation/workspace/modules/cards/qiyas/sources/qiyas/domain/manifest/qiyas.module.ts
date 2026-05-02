import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { QIYAS_PERMISSIONS, QIYAS_ROLES, QIYAS_ACTIONS } from './security/qiyas.security';
import { QIYAS_APPROVAL_MATRIX } from './security/qiyas.approval-matrix';

export const QIYAS_MANIFEST: ModuleManifest = {
  code: 'qiyas',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Qiyas Maturity Assessment',
  nameAr: 'قياس النضج',
  descriptionEn: 'GRC maturity assessment, benchmarking, roadmap planning, and strategic direction setting.',
  descriptionAr: 'تقييم نضج الحوكمة والمخاطر والامتثال والمقارنة المرجعية وتخطيط خارطة الطريق وتحديد الاتجاه الاستراتيجي.',
  tier: 'domain',
  category: 'advanced',
  routeBase: '/api/qiyas',
  eventNamespace: 'qiyas',
  tablePrefix: 'qiyas_',
  ownedTables: [
    'qiyas_assessments', 'qiyas_benchmarks', 'qiyas_capability_scores',
    'qiyas_dimensions', 'qiyas_domain_scores', 'qiyas_evidence_links',
    'qiyas_frameworks', 'qiyas_gap_analysis', 'qiyas_improvement_plans',
    'qiyas_maturity_levels', 'qiyas_maturity_models', 'qiyas_peer_comparisons',
    'qiyas_question_sets', 'qiyas_recommendations', 'qiyas_responses',
    'qiyas_roadmap_items', 'qiyas_score_history', 'qiyas_strategy_directions',
    'qiyas_target_profiles', 'qiyas_trend_analysis',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams', 'workflows', 'compliance_frameworks', 'risk_assessments', 'governance_health_scores'],
  aggregateRoots: ['qiyas_assessments', 'qiyas_maturity_models', 'qiyas_frameworks', 'qiyas_roadmap_items'],
  publishedEvents: [
    'qiyas.assessment_started', 'qiyas.assessment_completed',
    'qiyas.maturity_scored', 'qiyas.gap_identified',
    'qiyas.improvement_planned', 'qiyas.roadmap_created',
    'qiyas.benchmark_compared', 'qiyas.target_set',
    'qiyas.trend_detected', 'qiyas.strategy_direction_set',
  ],
  consumedEvents: [
    'compliance.posture_changed', 'risk.assessment_completed',
    'governance.health_score_updated', 'audit.engagement_completed',
    'workflow.status_changed',
  ],
  hardDeps: ['compliance', 'risk'],
  softDeps: ['governance', 'audit', 'evidence'],
  navId: 'qiyas',
  navChildCount: 12,
  workflowTemplateCode: 'qiyas_maturity_assessment',
  workflowSlaHours: 504,
  automationLevel: 'semi',
  agentBinding: 'A10',
  aiCapabilities: ['notes', 'drafts', 'recommendations', 'gate_checks', 'health_monitor'],
  aiEnabled: true,
  featureFlags: ['qiyas.benchmarking', 'qiyas.roadmap', 'qiyas.strategy_direction'],
  installable: true,
  provisioningOrder: 24,
  licensingTier: 'enterprise',
  visibility: 'both',
  adminSurfaces: ['maturity-models', 'benchmarking-config', 'dimension-config', 'strategy-settings'],

  securityPermissions: QIYAS_PERMISSIONS,
  securityRoles: QIYAS_ROLES,
  securityActions: QIYAS_ACTIONS,
  approvalRules: QIYAS_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'qiyas_assessments', ownerField: 'conducted_by', reviewerField: 'reviewer_id', approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'qiyas.module_lead', canDelegate: true, delegateRoles: ['qiyas.operator'], canReassign: true, reassignRoles: ['qiyas.module_lead', 'qiyas.executive_owner'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'qiyas_maturity_models', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'qiyas.module_lead', canDelegate: true, delegateRoles: ['qiyas.operator'], canReassign: true, reassignRoles: ['qiyas.module_lead', 'qiyas.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'qiyas_frameworks', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'qiyas.module_lead', canDelegate: true, delegateRoles: ['qiyas.operator'], canReassign: true, reassignRoles: ['qiyas.module_lead', 'qiyas.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'qiyas_roadmap_items', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: null, assigneeField: 'assignee_id', orgScopeField: 'org_id', defaultOwnerRole: 'qiyas.module_lead', canDelegate: true, delegateRoles: ['qiyas.operator', 'qiyas.contributor'], canReassign: true, reassignRoles: ['qiyas.module_lead', 'qiyas.executive_owner'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'qiyas.sod.assessor_approver', descriptionEn: 'Maturity assessor cannot approve their own assessment', descriptionAr: 'لا يمكن لمقيّم النضج الموافقة على تقييمه', conflictingRoles: [], conflictingActions: ['qiyas.assessment.conduct', 'qiyas.assessment.approve'], conflictingTransitions: ['in_progress->completed'], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['independent_review'], overrideAuthority: ['qiyas.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'qiyas.sod.scorer_publisher', descriptionEn: 'Score calculator cannot publish benchmark results', descriptionAr: 'لا يمكن لحاسب الدرجات نشر نتائج المقارنة', conflictingRoles: [], conflictingActions: ['qiyas.benchmark.calculate', 'qiyas.benchmark.publish'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: true, waiverMaxDays: 14, compensatingControls: ['peer_review'], overrideAuthority: ['qiyas.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/qiyas/services/qiyas-benchmark.service'
};

registerModule(QIYAS_MANIFEST);
