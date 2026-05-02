import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { GOVERNANCE_AI_PERMISSIONS, GOVERNANCE_AI_ROLES, GOVERNANCE_AI_ACTIONS } from './security/governance-ai.security';
import { GOVERNANCE_AI_APPROVAL_MATRIX } from './security/governance-ai.approval-matrix';

export const GOVERNANCE_AI_MANIFEST: ModuleManifest = {
  code: 'governance-ai',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Governance AI',
  nameAr: 'حوكمة الذكاء الاصطناعي',
  descriptionEn: 'AI-driven governance intelligence, signal detection, health analysis, compliance scoring, and narrative generation.',
  descriptionAr: 'ذكاء حوكمة مدفوع بالذكاء الاصطناعي وكشف الإشارات وتحليل الصحة وتسجيل الامتثال وتوليد السرد.',
  tier: 'full',
  category: 'ai_automation',
  routeBase: '/api/governance-ai',
  eventNamespace: 'governance_ai',
  tablePrefix: 'governance_ai_',
  ownedTables: [
    'governance_ai_signals', 'governance_ai_interpretations', 'governance_ai_escalations',
    'governance_ai_recommendations', 'governance_ai_narratives', 'governance_ai_pipeline_runs',
    'governance_ai_health_snapshots', 'governance_ai_score_explanations',
    'governance_ai_feedback', 'governance_ai_audit_log',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'risk_assessments', 'compliance_frameworks', 'workflows'],
  aggregateRoots: ['governance_ai_signals', 'governance_ai_pipeline_runs'],
  publishedEvents: [
    'governance_ai.signal_detected', 'governance_ai.interpretation_completed',
    'governance_ai.escalation_triggered', 'governance_ai.recommendation_generated',
    'governance_ai.narrative_generated', 'governance_ai.pipeline_completed',
    'governance_ai.health_snapshot_created', 'governance_ai.score_recalculated',
    'governance_ai.feedback_submitted',
  ],
  consumedEvents: [
    'risk.score_changed', 'risk.kri_threshold_breached', 'risk.appetite_breached',
    'compliance.posture_changed', 'compliance.gap_detected',
    'controls.effectiveness_failed', 'controls.test_overdue', 'controls.deficiency_detected',
    'incident.classified', 'incident.escalated',
    'audit.finding_created',
    'exception.approved', 'exception.expired',
    'workflow.status_changed', 'workflow.sla_breached',
    'ai_governance.monitoring_alert',
  ],
  hardDeps: [],
  softDeps: ['risk', 'compliance', 'incident', 'audit', 'controls', 'exception', 'workflow', 'ai-governance'],
  navId: 'governance-ai',
  navChildCount: 6,
  workflowTemplateCode: 'governance_ai_pipeline_review',
  workflowSlaHours: 72,
  automationLevel: 'full',
  agentBinding: 'A03',
  aiCapabilities: ['recommendations', 'scoring', 'summarization', 'anomaly_detection', 'classification'],
  aiEnabled: true,
  featureFlags: ['governance-ai.pipeline', 'governance-ai.narrative', 'governance-ai.health'],
  installable: true,
  provisioningOrder: 50,
  licensingTier: 'enterprise',
  visibility: 'internal',
  adminSurfaces: ['pipeline-config', 'signal-thresholds', 'escalation-rules', 'narrative-templates'],

  securityPermissions: GOVERNANCE_AI_PERMISSIONS,
  securityRoles: GOVERNANCE_AI_ROLES,
  securityActions: GOVERNANCE_AI_ACTIONS,
  approvalRules: GOVERNANCE_AI_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'governance_signal', ownerField: 'assigned_analyst', reviewerField: 'reviewer', approverField: null, assigneeField: 'assigned_analyst', orgScopeField: null, defaultOwnerRole: 'governance_ai.operator', canDelegate: true, delegateRoles: ['governance_ai.contributor'], canReassign: true, reassignRoles: ['governance_ai.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'governance_narrative', ownerField: 'generated_by', reviewerField: 'reviewer', approverField: 'approver', assigneeField: null, orgScopeField: null, defaultOwnerRole: 'governance_ai.operator', canDelegate: false, delegateRoles: [], canReassign: true, reassignRoles: ['governance_ai.module_lead'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'governance_ai.sod.interpreter_approver', descriptionEn: 'Signal interpreter cannot approve their own escalation narrative', descriptionAr: 'لا يمكن لمفسر الإشارة الموافقة على سرد التصعيد الخاص به', conflictingRoles: [], conflictingActions: ['governance_ai.signal.interpret', 'governance_ai.narrative.approve'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['senior_analyst_review'], overrideAuthority: ['governance_ai.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'governance_ai.sod.model_deployer', descriptionEn: 'Model trainer cannot deploy their own model to production', descriptionAr: 'لا يمكن لمدرب النموذج نشر نموذجه في الإنتاج', conflictingRoles: [], conflictingActions: ['governance_ai.model.train', 'governance_ai.model.deploy'], conflictingTransitions: ['testing->active'], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['model_review_board'], overrideAuthority: ['governance_ai.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
};

registerModule(GOVERNANCE_AI_MANIFEST);
