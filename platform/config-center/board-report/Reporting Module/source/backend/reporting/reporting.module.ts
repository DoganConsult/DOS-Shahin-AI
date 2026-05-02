import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { REPORTING_PERMISSIONS, REPORTING_ROLES, REPORTING_ACTIONS } from './security/reporting.security';
import { REPORTING_APPROVAL_MATRIX } from './security/reporting.approval-matrix';

export const REPORTING_MANIFEST: ModuleManifest = {
  code: 'reporting',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Reporting',
  nameAr: 'التقارير',
  descriptionEn: 'Regulatory and executive reporting, scheduled exports, dashboards, and subscription management.',
  descriptionAr: 'التقارير التنظيمية والتنفيذية والتصدير المجدول ولوحات المعلومات وإدارة الاشتراكات.',
  tier: 'platform',
  category: 'platform',
  routeBase: '/api/reporting',
  eventNamespace: 'reporting',
  tablePrefix: 'reporting_',
  ownedTables: [
    'reporting_definitions', 'reporting_schedules', 'reporting_snapshots',
    'reporting_templates', 'reporting_exports', 'reporting_subscriptions',
    'reporting_dashboards', 'reporting_widgets',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams'],
  aggregateRoots: ['reporting_definitions', 'reporting_templates', 'reporting_schedules', 'reporting_snapshots'],
  publishedEvents: [
    'reporting.report_generated', 'reporting.report_scheduled',
    'reporting.report_delivered', 'reporting.board_pack_assembled',
    'reporting.export_completed', 'reporting.template_created',
  ],
  consumedEvents: [
    'risk.score_changed', 'compliance.posture_changed',
    'analytics.kpi_snapshot_generated', 'audit.finding_created',
    'incident.classified',
  ],
  hardDeps: [],
  softDeps: ['foundation', 'analytics', 'risk', 'compliance', 'audit', 'incident'],
  navId: 'reporting',
  navChildCount: 9,
  workflowTemplateCode: 'reporting_release',
  workflowSlaHours: 72,
  automationLevel: 'semi',
  agentBinding: 'A11',
  aiCapabilities: ['drafts', 'recommendations', 'notes', 'health_monitor'],
  aiEnabled: true,
  featureFlags: ['reporting.scheduled_exports', 'reporting.custom_dashboards', 'reporting.board_packs', 'reporting.ai_narrative'],
  installable: true,
  provisioningOrder: 26,
  licensingTier: 'professional',
  visibility: 'both',
  adminSurfaces: ['report-templates', 'export-config', 'subscription-management', 'dashboard-builder'],

  securityPermissions: REPORTING_PERMISSIONS,
  securityRoles: REPORTING_ROLES,
  securityActions: REPORTING_ACTIONS,
  approvalRules: REPORTING_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'reporting_definitions', ownerField: 'created_by', reviewerField: 'reviewer_id', approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'reporting.module_lead', canDelegate: true, delegateRoles: ['reporting.contributor'], canReassign: true, reassignRoles: ['reporting.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'reporting_templates', ownerField: 'created_by', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'reporting.module_lead', canDelegate: true, delegateRoles: ['reporting.contributor'], canReassign: true, reassignRoles: ['reporting.module_lead', 'reporting.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'reporting_schedules', ownerField: 'created_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'reporting.operator', canDelegate: true, delegateRoles: ['reporting.contributor'], canReassign: true, reassignRoles: ['reporting.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'reporting_snapshots', ownerField: 'generated_by', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'reporting.module_lead', canDelegate: true, delegateRoles: ['reporting.operator'], canReassign: true, reassignRoles: ['reporting.module_lead', 'reporting.executive_owner'], requiresApproval: true, creatorRights: 'read_only', externalVisible: true, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'reporting.sod.author_publisher', descriptionEn: 'Report author cannot publish their own report', descriptionAr: 'لا يمكن لمؤلف التقرير نشر تقريره', conflictingRoles: [], conflictingActions: ['reporting.report.create', 'reporting.report.publish'], conflictingTransitions: ['draft->published'], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['peer_review'], overrideAuthority: ['reporting.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'reporting.sod.data_preparer_releaser', descriptionEn: 'Report data preparer cannot release the final snapshot', descriptionAr: 'لا يمكن لمعد بيانات التقرير إصدار اللقطة النهائية', conflictingRoles: [], conflictingActions: ['reporting.snapshot.prepare', 'reporting.snapshot.release'], conflictingTransitions: ['prepared->released'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: true, waiverMaxDays: 14, compensatingControls: ['manager_review'], overrideAuthority: ['reporting.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/reporting/services/report/report.service'
};

registerModule(REPORTING_MANIFEST);
