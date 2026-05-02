import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { WIDGETS_PERMISSIONS, WIDGETS_ROLES, WIDGETS_ACTIONS } from './security/widgets.security';
import { WIDGETS_APPROVAL_MATRIX } from './security/widgets.approval-matrix';

export const WIDGETS_MANIFEST: ModuleManifest = {
  code: 'widgets',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Widgets',
  nameAr: 'الأدوات',
  descriptionEn: 'Widget controllers and executive widget surfaces.',
  descriptionAr: '',
  tier: 'platform',
  category: 'platform_infra',
  routeBase: '/api/widgets',
  eventNamespace: 'widgets',
  tablePrefix: 'widgets_',
  ownedTables: ['widgets_registry', 'widgets_bundles', 'widgets_render_log'],
  sharedTables: ['module_settings'],
  referencedTables: ['risks', 'controls', 'findings', 'evidence', 'action_items', 'policies', 'assessments', 'maturity_scores', 'qiyas_recommendations', 'risk_kris', 'privacy_incidents', 'privacy_reviews', 'remediation_tasks', 'agrc_engine_runs'],
  aggregateRoots: ['WidgetDefinition', 'WidgetBundle'],
  publishedEvents: ['widgets.record.created', 'widgets.record.updated', 'widgets.record.deleted', 'widgets.status.changed'],
  consumedEvents: [
    'risk.score_changed', 'risk.record.created', 'risk.record.updated',
    'compliance.posture_changed', 'compliance.assessment_completed',
    'audit.finding_created', 'audit.record.updated',
    'evidence.record.created', 'evidence.record.deleted',
    'incident.record.created', 'incident.status_changed',
    'policy.record.updated', 'governance.decision_made',
    'dashboard.layout.changed', 'workflow.status_changed',
    'provisioning.completed',
  ],
  hardDeps: [],
  softDeps: ['risk', 'compliance', 'audit', 'evidence', 'governance'],
  navId: 'widgets',
  navChildCount: 0,
  workflowTemplateCode: 'widget_publish_review',
  workflowSlaHours: 24,
  automationLevel: 'semi',
  agentBinding: null,
  aiCapabilities: ['recommendations'],
  aiEnabled: false,
  featureFlags: ['widgets.custom_widgets'],
  installable: false,
  provisioningOrder: 50,
  licensingTier: 'starter',
  visibility: 'internal',
  adminSurfaces: ['widget-registry', 'bundle-config'],

  securityPermissions: WIDGETS_PERMISSIONS,
  securityRoles: WIDGETS_ROLES,
  securityActions: WIDGETS_ACTIONS,
  approvalRules: WIDGETS_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'widget_definitions', ownerField: 'created_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'widgets.module_lead', canDelegate: false, delegateRoles: [], canReassign: true, reassignRoles: ['widgets.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'widgets_bundles', ownerField: 'created_by', reviewerField: 'reviewer_id', approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'widgets.module_lead', canDelegate: true, delegateRoles: ['widgets.operator'], canReassign: true, reassignRoles: ['widgets.module_lead', 'widgets.executive_owner'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'widgets.sod.creator_publisher', descriptionEn: 'Widget creator cannot publish their own widget', descriptionAr: 'لا يمكن لمنشئ الأداة نشر أداته', conflictingRoles: [], conflictingActions: ['widgets.widget.create', 'widgets.widget.publish'], conflictingTransitions: ['draft->published'], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['peer_review'], overrideAuthority: ['widgets.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'widgets.sod.bundle_packager_activator', descriptionEn: 'Widget bundle packager cannot activate their own bundle', descriptionAr: 'لا يمكن لمعبئ حزمة الأدوات تفعيل حزمته', conflictingRoles: [], conflictingActions: ['widgets.bundle.package', 'widgets.bundle.activate'], conflictingTransitions: ['packaged->active'], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['peer_review'], overrideAuthority: ['widgets.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
};

registerModule(WIDGETS_MANIFEST);
