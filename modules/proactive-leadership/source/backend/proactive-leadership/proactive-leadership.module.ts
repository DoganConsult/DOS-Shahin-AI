import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { PROACTIVE_LEADERSHIP_PERMISSIONS, PROACTIVE_LEADERSHIP_ROLES, PROACTIVE_LEADERSHIP_ACTIONS } from './security/proactive-leadership.security';
import { PROACTIVE_LEADERSHIP_APPROVAL_MATRIX } from './security/proactive-leadership.approval-matrix';

export const PROACTIVE_LEADERSHIP_MANIFEST: ModuleManifest = {
  code: 'proactive-leadership',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Proactive Leadership',
  nameAr: 'القيادة الاستباقية',
  descriptionEn: 'AI-driven proactive leadership insights, executive dashboards, and strategic risk intelligence.',
  descriptionAr: 'رؤى القيادة الاستباقية المدعومة بالذكاء الاصطناعي ولوحات المعلومات التنفيذية والاستخبارات الاستراتيجية.',
  tier: 'domain',
  category: 'governance',
  routeBase: '/api/proactive-leadership',
  eventNamespace: 'proactive_leadership',
  tablePrefix: 'proactive_leadership_',
  ownedTables: [
    'proactive_leadership_configs', 'proactive_leadership_insights',
    'proactive_leadership_alerts',
  ],
  sharedTables: [],
  referencedTables: ['risk_assessments', 'compliance_assessments', 'governance_bodies'],
  aggregateRoots: ['proactive_leadership_insights'],
  publishedEvents: [
    'proactive_leadership.insight_generated', 'proactive_leadership.alert_triggered',
  ],
  consumedEvents: [
    'risk.assessment_completed', 'compliance.assessment_completed',
    'incident.created', 'governance.decision_made',
  ],
  hardDeps: [],
  softDeps: ['risk', 'compliance', 'governance', 'incident'],
  navId: 'proactive-leadership',
  navChildCount: 3,
  workflowTemplateCode: 'proactive_leadership_brief_review',
  workflowSlaHours: 168,
  automationLevel: 'semi',
  agentBinding: 'A17',
  aiCapabilities: ['recommendations', 'anomaly_detection', 'summarization'],
  aiEnabled: true,
  featureFlags: ['proactive_leadership.ai_insights', 'proactive_leadership.executive_brief'],
  installable: true,
  provisioningOrder: 29,
  licensingTier: 'enterprise',
  visibility: 'internal',
  adminSurfaces: ['leadership-config'],

  securityPermissions: PROACTIVE_LEADERSHIP_PERMISSIONS,
  securityRoles: PROACTIVE_LEADERSHIP_ROLES,
  securityActions: PROACTIVE_LEADERSHIP_ACTIONS,
  approvalRules: PROACTIVE_LEADERSHIP_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'proactive_leadership_insights', ownerField: 'created_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'proactive-leadership.module_lead', canDelegate: false, delegateRoles: [], canReassign: false, reassignRoles: [], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'proactive_leadership_alerts', ownerField: 'generated_by', reviewerField: 'reviewer_id', approverField: null, assigneeField: 'assigned_to', orgScopeField: 'org_id', defaultOwnerRole: 'proactive-leadership.module_lead', canDelegate: true, delegateRoles: ['proactive-leadership.operator'], canReassign: true, reassignRoles: ['proactive-leadership.module_lead', 'proactive-leadership.executive_owner'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'proactive_leadership.sod.brief_author_publisher', descriptionEn: 'Brief author cannot publish their own executive brief', descriptionAr: 'لا يمكن لمؤلف الملخص نشر ملخصه التنفيذي', conflictingRoles: [], conflictingActions: ['proactive_leadership.brief.draft', 'proactive_leadership.brief.publish'], conflictingTransitions: ['draft->published'], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['executive_review'], overrideAuthority: ['proactive-leadership.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'proactive_leadership.sod.insight_generator_endorser', descriptionEn: 'Insight generator cannot endorse their own insights', descriptionAr: 'لا يمكن لمولد الرؤى اعتماد رؤاه', conflictingRoles: [], conflictingActions: ['proactive_leadership.insight.generate', 'proactive_leadership.insight.endorse'], conflictingTransitions: ['generated->endorsed'], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['executive_review'], overrideAuthority: ['proactive-leadership.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
};

registerModule(PROACTIVE_LEADERSHIP_MANIFEST);
