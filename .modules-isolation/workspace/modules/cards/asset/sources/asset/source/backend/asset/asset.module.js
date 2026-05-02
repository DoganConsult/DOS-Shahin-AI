"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_MANIFEST = void 0;
const module_sdk_1 = require("@dos/module-sdk");
const asset_security_1 = require("./security/asset.security");
const asset_approval_matrix_1 = require("./security/asset.approval-matrix");
exports.ASSET_MANIFEST = {
    code: 'asset',
    version: '2.0.0',
    aliases: [],
    nameEn: 'Asset Management',
    nameAr: 'إدارة الأصول',
    descriptionEn: 'Asset inventory, classification, lifecycle management, and vulnerability tracking.',
    descriptionAr: 'جرد الأصول والتصنيف وإدارة دورة الحياة وتتبع الثغرات الأمنية.',
    tier: 'full',
    category: 'operational',
    routeBase: '/api/asset',
    eventNamespace: 'asset',
    tablePrefix: 'asset_',
    ownedTables: [
        'asset_categories', 'asset_classification_history', 'asset_classifications',
        'asset_compliance_links', 'asset_criticality_scores', 'asset_custody_history',
        'asset_dependencies', 'asset_documents', 'asset_inventory',
        'asset_lifecycle_events', 'asset_locations', 'asset_owners',
        'asset_risk_links', 'asset_scanning_schedules', 'asset_tags',
        'asset_types', 'asset_vulnerability_links',
    ],
    sharedTables: [],
    referencedTables: ['audit_trail', 'teams', 'workflows', 'risk_assessments', 'compliance_frameworks', 'vendor_engagements'],
    aggregateRoots: ['asset_inventory', 'asset_classifications', 'asset_types', 'asset_lifecycle_events'],
    publishedEvents: [
        'asset.created', 'asset.classified', 'asset.reclassified',
        'asset.custody_transferred', 'asset.decommissioned',
        'asset.vulnerability_detected', 'asset.criticality_changed',
        'asset.dependency_mapped', 'asset.lifecycle_event',
        'asset.owner_assigned', 'asset.compliance_linked',
    ],
    consumedEvents: [
        'risk.score_changed', 'vendor.risk_changed', 'incident.classified',
        'compliance.gap_detected', 'workflow.status_changed',
    ],
    hardDeps: ['risk'],
    softDeps: ['compliance', 'vendor', 'incident', 'evidence'],
    navId: 'assets',
    navChildCount: 10,
    workflowTemplateCode: 'asset_classification',
    workflowSlaHours: 168,
    automationLevel: 'semi',
    agentBinding: null,
    aiCapabilities: ['notes', 'recommendations', 'gate_checks'],
    aiEnabled: true,
    featureFlags: ['asset.auto_discovery', 'asset.vulnerability_scanning'],
    installable: true,
    provisioningOrder: 20,
    licensingTier: 'professional',
    visibility: 'both',
    adminSurfaces: ['asset-types-config', 'classification-rules', 'scanning-config', 'criticality-scoring'],
    securityPermissions: asset_security_1.ASSET_PERMISSIONS,
    securityRoles: asset_security_1.ASSET_ROLES,
    securityActions: asset_security_1.ASSET_ACTIONS,
    approvalRules: asset_approval_matrix_1.ASSET_APPROVAL_MATRIX,
    ownershipRules: [
        { entityType: 'asset', ownerField: 'custodian', reviewerField: 'classification_reviewer', approverField: null, assigneeField: null, orgScopeField: 'department_id', defaultOwnerRole: 'asset.module_lead', canDelegate: true, delegateRoles: ['asset.operator'], canReassign: true, reassignRoles: ['asset.module_lead', 'asset.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
        { entityType: 'asset_classifications', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'asset.module_lead', canDelegate: true, delegateRoles: ['asset.operator', 'asset.contributor'], canReassign: true, reassignRoles: ['asset.module_lead', 'asset.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
        { entityType: 'asset_lifecycle_events', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'asset.module_lead', canDelegate: true, delegateRoles: ['asset.operator', 'asset.contributor'], canReassign: true, reassignRoles: ['asset.module_lead', 'asset.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    ],
    sodRules: [
        { ruleCode: 'asset.sod.custodian_decommission', descriptionEn: 'Asset custodian cannot approve decommissioning of their own asset', descriptionAr: 'لا يمكن لأمين الأصل الموافقة على إيقاف أصله', conflictingRoles: [], conflictingActions: ['asset.record.custody', 'asset.record.decommission'], conflictingTransitions: ['active->decommissioned'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['manager_review'], overrideAuthority: ['asset.executive_owner'], auditObligations: ['log_sod_violation'] },
        { ruleCode: 'asset.sod.classifier_approver', descriptionEn: 'Asset classifier cannot approve their own classification', descriptionAr: 'لا يمكن لمصنف الأصل الموافقة على تصنيفه', conflictingRoles: [], conflictingActions: ['asset.classification.perform', 'asset.classification.approve'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['independent_review'], overrideAuthority: ['asset.executive_owner'], auditObligations: ['log_sod_violation'] },
    ],
    mcpServiceEntrypoint: 'modules/asset/services/asset-registry.service'
};
(0, module_sdk_1.registerModule)(exports.ASSET_MANIFEST);
//# sourceMappingURL=asset.module.js.map