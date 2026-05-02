"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_MANIFEST = void 0;
const module_sdk_1 = require("@dos/module-sdk");
const action_security_1 = require("./security/action.security");
const action_approval_matrix_1 = require("./security/action.approval-matrix");
exports.ACTION_MANIFEST = {
    code: 'action',
    version: '2.0.0',
    aliases: [],
    nameEn: 'Action Items',
    nameAr: 'بنود الإجراءات',
    descriptionEn: 'Action item lifecycle management, assignments, recurrence, and cross-module task tracking.',
    descriptionAr: 'إدارة دورة حياة بنود الإجراءات والتعيينات والتكرار وتتبع المهام عبر الوحدات.',
    tier: 'full',
    category: 'core_grc',
    routeBase: '/api/action',
    eventNamespace: 'action',
    tablePrefix: 'action_',
    ownedTables: [
        'action_items', 'action_assignments', 'action_audit_log',
        'action_categories', 'action_comments', 'action_dependencies',
        'action_evidence_links', 'action_history', 'action_notifications',
        'action_priorities', 'action_recurrence_rules', 'action_status_transitions',
        'action_templates', 'action_time_tracking',
    ],
    sharedTables: [],
    referencedTables: ['audit_trail', 'teams', 'workflows', 'remediation_plans', 'governance_action_items'],
    aggregateRoots: ['action_items', 'action_assignments', 'action_templates'],
    publishedEvents: [
        'action.created', 'action.assigned', 'action.started',
        'action.completed', 'action.overdue', 'action.escalated',
        'action.cancelled', 'action.reassigned', 'action.verified',
        'action.dependency_resolved', 'action.recurrence_triggered',
    ],
    consumedEvents: [
        'remediation.action_assigned', 'governance.action_created',
        'audit.finding_created', 'incident.capa_assigned',
        'compliance.gap_detected', 'workflow.status_changed',
    ],
    hardDeps: ['remediation'],
    softDeps: ['governance', 'audit', 'incident', 'compliance'],
    navId: 'actions',
    navChildCount: 7,
    workflowTemplateCode: 'action_item_lifecycle',
    workflowSlaHours: 168,
    automationLevel: 'full',
    agentBinding: null,
    aiCapabilities: ['notes', 'recommendations', 'gate_checks'],
    aiEnabled: true,
    featureFlags: ['action.recurrence', 'action.ai_prioritization'],
    installable: true,
    provisioningOrder: 22,
    licensingTier: 'starter',
    visibility: 'both',
    adminSurfaces: ['action-templates', 'priority-config', 'recurrence-rules'],
    securityPermissions: action_security_1.ACTION_PERMISSIONS,
    securityRoles: action_security_1.ACTION_ROLES,
    securityActions: action_security_1.ACTION_ACTIONS,
    approvalRules: action_approval_matrix_1.ACTION_APPROVAL_MATRIX,
    ownershipRules: [
        { entityType: 'action_item', ownerField: 'created_by', reviewerField: 'verifier', approverField: null, assigneeField: 'assignee', orgScopeField: 'department_id', defaultOwnerRole: 'action.contributor', canDelegate: true, delegateRoles: ['action.operator'], canReassign: true, reassignRoles: ['action.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'team' },
        { entityType: 'action_assignments', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'action.module_lead', canDelegate: true, delegateRoles: ['action.operator', 'action.contributor'], canReassign: true, reassignRoles: ['action.module_lead', 'action.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
        { entityType: 'action_items', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'action.module_lead', canDelegate: true, delegateRoles: ['action.operator', 'action.contributor'], canReassign: true, reassignRoles: ['action.module_lead', 'action.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
        { entityType: 'action_templates', ownerField: 'owner_id', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: 'assignee_id', orgScopeField: 'department_id', defaultOwnerRole: 'action.module_lead', canDelegate: true, delegateRoles: ['action.operator', 'action.contributor'], canReassign: true, reassignRoles: ['action.module_lead', 'action.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'department' },
    ],
    sodRules: [
        { ruleCode: 'action.sod.assignee_verifier', descriptionEn: 'Action assignee cannot verify their own action completion', descriptionAr: 'لا يمكن للمكلف بالإجراء التحقق من إكمال إجرائه', conflictingRoles: [], conflictingActions: ['action.item.complete', 'action.item.verify'], conflictingTransitions: ['completed->verified'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['manager_review'], overrideAuthority: ['action.module_lead'], auditObligations: ['log_sod_violation'] },
        { ruleCode: 'action.sod.creator_closer', descriptionEn: 'Action creator cannot close their own action without independent verification', descriptionAr: 'لا يمكن لمنشئ الإجراء إغلاق إجرائه بدون تحقق مستقل', conflictingRoles: [], conflictingActions: ['action.item.create', 'action.item.close'], conflictingTransitions: ['in_progress->closed'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: true, waiverMaxDays: 14, compensatingControls: ['peer_review'], overrideAuthority: ['action.module_lead'], auditObligations: ['log_sod_violation'] },
    ],
    mcpServiceEntrypoint: 'modules/action/services/action-item.service'
};
(0, module_sdk_1.registerModule)(exports.ACTION_MANIFEST);
//# sourceMappingURL=action.module.js.map