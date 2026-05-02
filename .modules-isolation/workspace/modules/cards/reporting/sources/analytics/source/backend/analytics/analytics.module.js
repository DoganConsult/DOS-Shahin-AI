"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYTICS_MANIFEST = void 0;
const module_sdk_1 = require("@dos/module-sdk");
const analytics_security_1 = require("./security/analytics.security");
const analytics_approval_matrix_1 = require("./security/analytics.approval-matrix");
const analytics_events_1 = require("./events/analytics.events");
exports.ANALYTICS_MANIFEST = {
    code: 'analytics',
    version: '2.0.0',
    aliases: [],
    nameEn: 'Analytics',
    nameAr: 'التحليلات',
    descriptionEn: 'Custom dashboards, metrics, and real-time data insights across GRC domains.',
    descriptionAr: 'لوحات المعلومات المخصصة والمقاييس والرؤى الفورية عبر مجالات الحوكمة والمخاطر والامتثال.',
    tier: 'platform',
    category: 'platform',
    routeBase: '/api/analytics',
    eventNamespace: 'analytics',
    tablePrefix: 'analytics_',
    ownedTables: [
        'analytics_dashboards', 'analytics_datasets', 'analytics_metrics',
        'analytics_queries', 'analytics_refresh_schedules', 'analytics_snapshots',
        'analytics_widgets', 'analytics_cache',
    ],
    sharedTables: [],
    referencedTables: ['audit_trail', 'teams'],
    aggregateRoots: ['analytics_dashboards', 'analytics_datasets', 'analytics_metrics'],
    publishedEvents: analytics_events_1.ANALYTICS_PUBLISHED_EVENTS,
    consumedEvents: analytics_events_1.ANALYTICS_CONSUMED_EVENTS,
    hardDeps: [],
    softDeps: ['foundation', 'reporting'],
    navId: 'analytics',
    navChildCount: 5,
    workflowTemplateCode: 'analytics_dashboard_publish',
    workflowSlaHours: 168,
    automationLevel: 'semi',
    agentBinding: 'A12',
    aiCapabilities: ['trend_narration', 'anomaly_explanation', 'kpi_summary', 'benchmark_interpretation', 'predictive_narrative'],
    aiEnabled: true,
    featureFlags: ['analytics.custom_dashboards', 'analytics.ai_insights'],
    installable: true,
    provisioningOrder: 6,
    licensingTier: 'professional',
    visibility: 'internal',
    adminSurfaces: ['dashboard-config', 'dataset-management', 'refresh-schedules'],
    securityPermissions: analytics_security_1.ANALYTICS_PERMISSIONS,
    securityRoles: analytics_security_1.ANALYTICS_ROLES,
    securityActions: analytics_security_1.ANALYTICS_ACTIONS,
    approvalRules: analytics_approval_matrix_1.ANALYTICS_APPROVAL_MATRIX,
    ownershipRules: [
        { entityType: 'analytics_dashboards', ownerField: 'created_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'analytics.module_lead', canDelegate: true, delegateRoles: ['analytics.contributor',], canReassign: true, reassignRoles: ['analytics.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
        { entityType: 'analytics_datasets', ownerField: 'created_by', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'analytics.module_lead', canDelegate: true, delegateRoles: ['analytics.contributor'], canReassign: true, reassignRoles: ['analytics.module_lead', 'analytics.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    ],
    sodRules: [
        { ruleCode: 'analytics.sod.creator_publisher', descriptionEn: 'Dashboard creator cannot publish their own dashboard without review', descriptionAr: 'لا يمكن لمنشئ لوحة المعلومات نشرها بدون مراجعة', conflictingRoles: [], conflictingActions: ['analytics.dashboard.create', 'analytics.dashboard.publish'], conflictingTransitions: ['draft->published'], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['peer_review'], overrideAuthority: ['analytics.executive_owner'], auditObligations: ['log_sod_violation'] },
        { ruleCode: 'analytics.sod.dataset_author_activator', descriptionEn: 'Dataset author cannot activate their own dataset for production use', descriptionAr: 'لا يمكن لمؤلف مجموعة البيانات تفعيلها للاستخدام الإنتاجي', conflictingRoles: [], conflictingActions: ['analytics.dataset.create', 'analytics.dataset.activate'], conflictingTransitions: ['draft->active'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['peer_review'], overrideAuthority: ['analytics.executive_owner'], auditObligations: ['log_sod_violation'] },
    ],
    mcpServiceEntrypoint: 'modules/analytics/services/analytics/analytics.service'
};
(0, module_sdk_1.registerModule)(exports.ANALYTICS_MANIFEST);
//# sourceMappingURL=analytics.module.js.map