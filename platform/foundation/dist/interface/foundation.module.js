"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_MANIFEST = void 0;
const module_sdk_1 = require("@dos/module-sdk");
const foundation_security_1 = require("./security/foundation.security");
const foundation_approval_matrix_1 = require("./security/foundation.approval-matrix");
exports.FOUNDATION_MANIFEST = {
    code: 'foundation',
    version: '2.0.0',
    aliases: [],
    nameEn: 'Foundation — Organization Hierarchy',
    nameAr: 'الأساس — الهيكل التنظيمي',
    descriptionEn: 'Organization hierarchy, business units, departments, positions, legal entities, and structural scope resolution.',
    descriptionAr: 'الهيكل التنظيمي ووحدات الأعمال والإدارات والمناصب والكيانات القانونية وتحليل النطاق الهيكلي.',
    tier: 'platform',
    category: 'platform',
    routeBase: '/api/foundation',
    eventNamespace: 'foundation',
    tablePrefix: 'foundation_',
    ownedTables: [
        'organizations', 'business_units', 'departments', 'positions',
        'legal_entities', 'org_hierarchy_links', 'foundation_audit_log',
    ],
    sharedTables: [],
    referencedTables: ['tenants', 'users', 'teams'],
    aggregateRoots: ['organizations', 'business_units', 'departments'],
    publishedEvents: [
        'foundation.org_created', 'foundation.org_updated',
        'foundation.dept_created', 'foundation.dept_updated',
        'foundation.role_assigned', 'foundation.role_revoked',
        'foundation.scope_changed',
    ],
    consumedEvents: [
        'workflow.status_changed',
    ],
    hardDeps: [],
    softDeps: ['team', 'workflow'],
    navId: 'foundation',
    navChildCount: 5,
    workflowTemplateCode: 'foundation_org_change',
    workflowSlaHours: 168,
    automationLevel: 'semi',
    agentBinding: null,
    aiCapabilities: ['recommendations'],
    aiEnabled: true,
    featureFlags: ['foundation.hierarchy_visualization'],
    installable: false,
    provisioningOrder: 2,
    licensingTier: 'starter',
    visibility: 'internal',
    adminSurfaces: ['org-structure', 'department-config', 'position-catalog'],
    securityPermissions: foundation_security_1.FOUNDATION_PERMISSIONS,
    securityRoles: foundation_security_1.FOUNDATION_ROLES,
    securityActions: foundation_security_1.FOUNDATION_ACTIONS,
    approvalRules: foundation_approval_matrix_1.FOUNDATION_APPROVAL_MATRIX,
    ownershipRules: [
        { entityType: 'organizations', ownerField: 'admin_id', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'id', defaultOwnerRole: 'foundation.executive_owner', canDelegate: true, delegateRoles: ['foundation.module_lead'], canReassign: true, reassignRoles: ['foundation.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
        { entityType: 'business_units', ownerField: 'head_id', reviewerField: null, approverField: 'approver_id', assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'foundation.module_lead', canDelegate: true, delegateRoles: ['foundation.operator'], canReassign: true, reassignRoles: ['foundation.module_lead', 'foundation.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
        { entityType: 'departments', ownerField: 'head_id', reviewerField: null, approverField: 'approver_id', assigneeField: null, orgScopeField: 'business_unit_id', defaultOwnerRole: 'foundation.module_lead', canDelegate: true, delegateRoles: ['foundation.operator'], canReassign: true, reassignRoles: ['foundation.module_lead', 'foundation.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    ],
    sodRules: [
        { ruleCode: 'foundation.sod.restructurer_approver', descriptionEn: 'Org restructurer cannot approve their own restructuring', descriptionAr: 'لا يمكن لمعيد هيكلة المنظمة الموافقة على إعادة هيكلته', conflictingRoles: ['foundation.contributor', 'foundation.approver'], conflictingActions: ['foundation.record.write', 'foundation.record.approve'], conflictingTransitions: [], severity: 'critical', enforcement: 'hard_block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['executive_review'], overrideAuthority: ['foundation.executive_owner'], auditObligations: ['log_sod_violation'] },
        { ruleCode: 'foundation.sod.creator_merger', descriptionEn: 'Department creator cannot approve merging their own department', descriptionAr: 'لا يمكن لمنشئ الإدارة الموافقة على دمج إدارته', conflictingRoles: ['foundation.contributor', 'foundation.executive_owner'], conflictingActions: ['foundation.record.write', 'foundation.record.delete'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['executive_review'], overrideAuthority: ['foundation.executive_owner'], auditObligations: ['log_sod_violation'] },
    ],
    mcpServiceEntrypoint: 'modules/platform/services/misc/mapping.service'
};
(0, module_sdk_1.registerModule)(exports.FOUNDATION_MANIFEST);
//# sourceMappingURL=foundation.module.js.map