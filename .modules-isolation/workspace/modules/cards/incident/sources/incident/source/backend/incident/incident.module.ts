import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { INCIDENT_PERMISSIONS, INCIDENT_ROLES, INCIDENT_ACTIONS } from './security/incident.security';
import { INCIDENT_APPROVAL_MATRIX } from './security/incident.approval-matrix';

export const INCIDENT_MANIFEST: ModuleManifest = {
  code: 'incident',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Incident Management',
  nameAr: 'إدارة الحوادث',
  descriptionEn: 'Incident response, classification, war room, root cause analysis, and regulatory reporting.',
  descriptionAr: 'الاستجابة للحوادث والتصنيف وغرفة الحرب وتحليل السبب الجذري والتقارير التنظيمية.',
  tier: 'full',
  category: 'operational',
  routeBase: '/api/incident',
  eventNamespace: 'incident',
  tablePrefix: 'incident_',
  ownedTables: [
    'incident_assets', 'incident_audit_log', 'incident_evidence',
    'incident_impacts', 'incident_lessons_learned', 'incident_notifications_log',
    'incident_pir', 'incident_policies', 'incident_recurring_patterns',
    'incident_classifications', 'incident_containment_actions', 'incident_escalations',
    'incident_response_plans', 'incident_stakeholders', 'incident_timeline_entries',
    'incident_root_cause_analysis', 'incident_categories', 'incident_severity_matrix',
    'incident_regulatory_reports', 'incident_near_misses',
  ],
  sharedTables: ['breach_reporting_records', 'war_rooms', 'triage_proposals'],
  referencedTables: ['audit_trail', 'teams', 'workflows', 'assets', 'risk_assessments'],
  aggregateRoots: ['incident_response_plans', 'incident_categories', 'incident_severity_matrix'],
  publishedEvents: [
    'incident.created', 'incident.classified', 'incident.contained',
    'incident.escalated', 'incident.closed', 'incident.breach_reported',
    'incident.capa_assigned', 'incident.near_miss_reported', 'incident.pir_completed',
    'incident.lesson_documented', 'incident.regulatory_notified',
    'incident.severity_changed', 'incident.owner_assigned', 'incident.war_room_opened',
    'incident.war_room_closed', 'incident.evidence_attached',
    'incident.timeline_updated', 'incident.root_cause_identified',
    'incident.triage_completed', 'incident.impact_assessed',
    'incident.containment_verified', 'incident.recovery_started',
    'incident.recovery_completed', 'incident.case_created', 'incident.case_closed',
  ],
  consumedEvents: [
    'risk.residual_high', 'compliance.posture_changed', 'vendor.risk_changed',
    'bcp.crisis_declared', 'workflow.status_changed', 'ai.alert.created',
  ],
  hardDeps: ['risk'],
  softDeps: ['compliance', 'evidence', 'bcp', 'vendor', 'asset'],
  navId: 'incidents',
  navChildCount: 18,
  workflowTemplateCode: 'incident_response',
  workflowSlaHours: 24,
  automationLevel: 'full',
  agentBinding: 'A07',
  aiCapabilities: ['notes', 'drafts', 'recommendations', 'gate_checks', 'anomaly_detection'],
  aiEnabled: true,
  featureFlags: ['incident.war_room', 'incident.regulatory_reporting', 'incident.ai_triage'],
  installable: true,
  provisioningOrder: 16,
  licensingTier: 'starter',
  visibility: 'both',
  adminSurfaces: ['incident-categories', 'severity-matrix', 'response-templates', 'regulatory-thresholds'],

  securityPermissions: INCIDENT_PERMISSIONS,
  securityRoles: INCIDENT_ROLES,
  securityActions: INCIDENT_ACTIONS,
  approvalRules: INCIDENT_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'incident', ownerField: 'owner', reviewerField: 'response_leader', approverField: null, assigneeField: 'assignee', orgScopeField: 'department_id', defaultOwnerRole: 'incident.module_lead', canDelegate: true, delegateRoles: ['incident.operator'], canReassign: true, reassignRoles: ['incident.module_lead', 'incident.executive_owner'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'incident_investigations', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'incident.module_lead', canDelegate: true, delegateRoles: ['incident.operator', 'incident.contributor'], canReassign: true, reassignRoles: ['incident.module_lead', 'incident.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    { entityType: 'incident_response_actions', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'incident.module_lead', canDelegate: true, delegateRoles: ['incident.operator', 'incident.contributor'], canReassign: true, reassignRoles: ['incident.module_lead', 'incident.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
  ],
  sodRules: [
    { ruleCode: 'incident.sod.reporter_closer', descriptionEn: 'Reporter cannot close their own incident', descriptionAr: 'لا يمكن للمبلغ إغلاق الحادث الخاص به', conflictingRoles: [], conflictingActions: ['incident.record.create', 'incident.record.close'], conflictingTransitions: ['open->closed'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['manager_review'], overrideAuthority: ['incident.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'incident.sod.investigator_approver', descriptionEn: 'Investigator cannot approve their own investigation', descriptionAr: 'لا يمكن للمحقق الموافقة على تحقيقه', conflictingRoles: [], conflictingActions: ['incident.investigation.conduct', 'incident.investigation.approve'], conflictingTransitions: [], severity: 'critical', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: [], overrideAuthority: ['incident.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/incident/services/incident/incident.service'
};

registerModule(INCIDENT_MANIFEST);
