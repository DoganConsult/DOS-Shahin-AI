import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { AUDIT_PERMISSIONS, AUDIT_ROLES, AUDIT_ACTIONS } from './security/audit.security';
import { AUDIT_APPROVAL_MATRIX } from './security/audit.approval-matrix';

export const AUDIT_MANIFEST: ModuleManifest = {
  code: 'audit',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Audit Management',
  nameAr: 'إدارة التدقيق',
  descriptionEn: 'Internal and external audit planning, execution, findings management, and working papers.',
  descriptionAr: 'تخطيط وتنفيذ التدقيق الداخلي والخارجي وإدارة النتائج وأوراق العمل.',
  tier: 'full',
  category: 'core_grc',
  routeBase: '/api/audit',
  eventNamespace: 'audit',
  tablePrefix: 'audit_',
  ownedTables: [
    'audits', 'audit_anomalies', 'audit_finding_slas', 'audit_prep_checklists',
    'audit_qa_reviews', 'audit_ratings', 'audit_request_items', 'audit_requests',
    'audit_risk_scores', 'audit_schedules', 'audit_scopes', 'audit_team_members',
    'audit_templates', 'audit_test_plans', 'audit_time_entries',
    'audit_universe', 'audit_working_papers',
  ],
  sharedTables: ['audit_trail', 'audit_trail_archive'],
  referencedTables: ['teams', 'workflows', 'compliance_frameworks', 'risk_assessments', 'evidence_links'],
  aggregateRoots: ['audits', 'audit_universe', 'audit_schedules', 'audit_working_papers'],
  publishedEvents: [
    'audit.finding_created', 'audit.finding_issued', 'audit.status_changed',
    'audit.remediation_due', 'audit.report_imported', 'audit.workpaper_generated',
    'audit.prep_generated', 'audit.plan_approved', 'audit.engagement_started',
    'audit.engagement_completed', 'audit.scope_changed',
  ],
  consumedEvents: [
    'compliance.gap_detected', 'risk.residual_high', 'evidence.collected',
    'incident.classified', 'vendor.assessment_due', 'workflow.status_changed',
  ],
  hardDeps: ['compliance', 'evidence'],
  softDeps: ['risk', 'policy', 'vendor', 'incident'],
  navId: 'audit',
  navChildCount: 7,
  workflowTemplateCode: 'audit_planning_workflow',
  workflowSlaHours: 504,
  automationLevel: 'semi',
  agentBinding: 'A06',
  aiCapabilities: ['notes', 'drafts', 'recommendations', 'gate_checks', 'health_monitor'],
  aiEnabled: true,
  featureFlags: ['audit.continuous_auditing', 'audit.ai_findings', 'audit.regulatory'],
  installable: true,
  provisioningOrder: 14,
  licensingTier: 'starter',
  visibility: 'both',
  adminSurfaces: ['audit-templates', 'audit-universe-config', 'rating-config', 'sla-config'],

  securityPermissions: AUDIT_PERMISSIONS,
  securityRoles: AUDIT_ROLES,
  securityActions: AUDIT_ACTIONS,
  approvalRules: AUDIT_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'audits', ownerField: 'lead_auditor_id', reviewerField: 'quality_reviewer_id', approverField: null, assigneeField: 'assigned_auditor_id', orgScopeField: 'department_id', defaultOwnerRole: 'audit.module_lead', canDelegate: true, delegateRoles: ['audit.operator'], canReassign: true, reassignRoles: ['audit.module_lead', 'audit.executive_owner'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'audit_findings', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'audit.module_lead', canDelegate: true, delegateRoles: ['audit.operator', 'audit.contributor'], canReassign: true, reassignRoles: ['audit.module_lead', 'audit.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'audit_working_papers', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'audit.module_lead', canDelegate: true, delegateRoles: ['audit.operator', 'audit.contributor'], canReassign: true, reassignRoles: ['audit.module_lead', 'audit.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
  ],
  sodRules: [
    { ruleCode: 'audit.sod.auditor_auditee', descriptionEn: 'Auditor cannot audit their own department or work', descriptionAr: 'لا يمكن للمدقق تدقيق قسمه أو عمله', conflictingRoles: [], conflictingActions: ['audit.audit.conduct', 'audit.audit.be_auditee'], conflictingTransitions: [], severity: 'critical', enforcement: 'hard_block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: [], overrideAuthority: ['audit.executive_owner'], auditObligations: ['log_sod_violation', 'notify_compliance_team'] },
    { ruleCode: 'audit.sod.finder_closer', descriptionEn: 'Finding creator cannot close their own finding', descriptionAr: 'لا يمكن لمنشئ الملاحظة إغلاقها', conflictingRoles: [], conflictingActions: ['audit.finding.create', 'audit.finding.close'], conflictingTransitions: ['open->closed'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['manager_review'], overrideAuthority: ['audit.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/audit/services/audit/core/audit-trail.service'
};

registerModule(AUDIT_MANIFEST);
