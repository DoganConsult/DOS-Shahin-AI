import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { BCP_PERMISSIONS, BCP_ROLES, BCP_ACTIONS } from './security/bcp.security';
import { BCP_APPROVAL_MATRIX } from './security/bcp.approval-matrix';

export const BCP_MANIFEST: ModuleManifest = {
  code: 'bcp',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Business Continuity',
  nameAr: 'استمرارية الأعمال',
  descriptionEn: 'Business continuity planning, impact analysis, crisis management, and exercise management.',
  descriptionAr: 'تخطيط استمرارية الأعمال وتحليل التأثير وإدارة الأزمات وإدارة التمارين.',
  tier: 'full',
  category: 'operational',
  routeBase: '/api/bcp',
  eventNamespace: 'bcp',
  tablePrefix: 'bcp_',
  ownedTables: [
    'bcp_activities', 'bcp_ai_feedback', 'bcp_ai_recommendations',
    'bcp_ai_runs', 'bcp_assessment_items', 'bcp_assessments',
    'bcp_audit_log', 'bcp_communication_plans', 'bcp_contact_lists',
    'bcp_crisis_simulations', 'bcp_dependency_maps', 'bcp_documents',
    'bcp_exercises', 'bcp_impact_analysis', 'bcp_incidents',
    'bcp_lessons_learned', 'bcp_maturity_scores', 'bcp_plans',
    'bcp_recovery_objectives', 'bcp_recovery_strategies', 'bcp_resource_requirements',
    'bcp_review_cycles', 'bcp_risk_links', 'bcp_scenarios',
    'bcp_stakeholders', 'bcp_teams', 'bcp_test_results',
    'bcp_timeline_entries',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams', 'workflows', 'risk_assessments', 'assets', 'incident_response_plans'],
  aggregateRoots: ['bcp_plans', 'bcp_assessments', 'bcp_exercises', 'bcp_recovery_objectives'],
  publishedEvents: [
    'bcp.plan_created', 'bcp.plan_activated', 'bcp.plan_reviewed',
    'bcp.crisis_declared', 'bcp.crisis_resolved', 'bcp.exercise_completed',
    'bcp.exercise_scheduled', 'bcp.impact_analysis_completed',
    'bcp.recovery_objective_breached', 'bcp.dependency_identified',
    'bcp.lesson_documented', 'bcp.maturity_assessed',
    'bcp.test_passed', 'bcp.test_failed',
    'bcp.communication_sent', 'bcp.stakeholder_notified',
  ],
  consumedEvents: [
    'risk.residual_high', 'incident.created', 'incident.escalated',
    'asset.classified', 'vendor.risk_changed', 'workflow.status_changed',
  ],
  hardDeps: ['risk', 'incident'],
  softDeps: ['asset', 'vendor', 'compliance', 'evidence'],
  navId: 'bcp',
  navChildCount: 15,
  workflowTemplateCode: 'business_continuity_test',
  workflowSlaHours: 720,
  automationLevel: 'semi',
  agentBinding: 'A09',
  aiCapabilities: ['notes', 'drafts', 'recommendations', 'gate_checks', 'health_monitor'],
  aiEnabled: true,
  featureFlags: ['bcp.crisis_simulation', 'bcp.dependency_mapping', 'bcp.ai_recommendations'],
  installable: true,
  provisioningOrder: 19,
  licensingTier: 'professional',
  visibility: 'both',
  adminSurfaces: ['bcp-templates', 'recovery-objectives-config', 'exercise-scheduling', 'crisis-playbooks'],

  securityPermissions: BCP_PERMISSIONS,
  securityRoles: BCP_ROLES,
  securityActions: BCP_ACTIONS,
  approvalRules: BCP_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'bcp_plan', ownerField: 'plan_owner', reviewerField: 'reviewer', approverField: null, assigneeField: null, orgScopeField: 'department_id', defaultOwnerRole: 'bcp.module_lead', canDelegate: true, delegateRoles: ['bcp.operator', 'bcp.contributor'], canReassign: true, reassignRoles: ['bcp.module_lead', 'bcp.executive_owner'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'bcp_exercise', ownerField: 'exercise_lead', reviewerField: 'evaluator', approverField: null, assigneeField: null, orgScopeField: 'department_id', defaultOwnerRole: 'bcp.operator', canDelegate: true, delegateRoles: ['bcp.contributor'], canReassign: true, reassignRoles: ['bcp.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
  ],
  sodRules: [
    { ruleCode: 'bcp.sod.author_approver', descriptionEn: 'BCP plan author cannot approve their own plan', descriptionAr: 'لا يمكن لمؤلف خطة استمرارية الأعمال الموافقة على خطته', conflictingRoles: [], conflictingActions: ['bcp.plan.create', 'bcp.plan.approve'], conflictingTransitions: ['draft->approved'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['senior_management_review'], overrideAuthority: ['bcp.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'bcp.sod.conductor_evaluator', descriptionEn: 'Exercise conductor cannot evaluate their own exercise', descriptionAr: 'لا يمكن لمدير التمرين تقييم تمرينه', conflictingRoles: [], conflictingActions: ['bcp.exercise.conduct', 'bcp.exercise.evaluate'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['independent_assessment'], overrideAuthority: ['bcp.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/bcp/services/bcp.service'
};

registerModule(BCP_MANIFEST);
