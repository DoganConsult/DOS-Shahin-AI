"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTESTATION_MANIFEST = void 0;
const module_sdk_1 = require("@dos/module-sdk");
exports.ATTESTATION_MANIFEST = {
    code: 'attestation',
    version: '1.0.0',
    aliases: [],
    nameEn: 'Attestation Management',
    nameAr: 'إدارة التصديق',
    descriptionEn: 'Periodic and continuous attestation campaigns, compliance evidence collection, and SoD-enforced review workflows.',
    descriptionAr: 'حملات التصديق الدورية والمستمرة، جمع أدلة الامتثال، وسير عمل المراجعة المطبقة بفصل المهام.',
    tier: 'cross-module',
    category: 'product',
    routeBase: '/api/attestation',
    eventNamespace: 'attestation',
    tablePrefix: 'attestation_',
    ownedTables: ['attestation_campaigns', 'attestation_records', 'attestation_evidence_links'],
    sharedTables: [],
    referencedTables: ['users', 'evidence'],
    aggregateRoots: ['attestation_campaigns'],
    publishedEvents: ['attestation.campaign_created', 'attestation.record_reviewed'],
    consumedEvents: ['compliance.control_updated'],
    hardDeps: ['foundation'],
    softDeps: ['compliance', 'evidence', 'workflow', 'inbox'],
    navId: 'attestation',
    navChildCount: 3,
    workflowTemplateCode: 'attestation_campaign_approval',
    workflowSlaHours: 48,
    automationLevel: 'semi',
    agentBinding: null,
    aiCapabilities: [],
    aiEnabled: false,
    featureFlags: [],
    installable: true,
    provisioningOrder: 20,
    licensingTier: 'professional',
    visibility: 'internal',
    adminSurfaces: ['attestation-config'],
    securityPermissions: [
        { permissionCode: 'attestation.read', resourceType: 'campaign', actionType: 'read', descriptionEn: 'View campaigns and records', descriptionAr: 'عرض الحملات والسجلات', sensitive: false },
        { permissionCode: 'attestation.campaign.manage', resourceType: 'campaign', actionType: 'manage', descriptionEn: 'Create and manage campaigns', descriptionAr: 'إنشاء وإدارة الحملات', sensitive: true },
        { permissionCode: 'attestation.record.manage', resourceType: 'record', actionType: 'manage', descriptionEn: 'Submit attestation records', descriptionAr: 'تقديم سجلات التصديق', sensitive: false },
        { permissionCode: 'attestation.record.review', resourceType: 'record', actionType: 'review', descriptionEn: 'Review attestation submissions', descriptionAr: 'مراجعة طلبات التصديق', sensitive: true }
    ],
    securityRoles: [
        { roleCode: 'attestation.viewer', archetype: 'viewer', nameEn: 'Attestation Viewer', nameAr: 'عارض التصديق', isDefault: true, isSystem: true, isGlobal: false, permissions: ['attestation.read'] },
        { roleCode: 'attestation.attestor', archetype: 'contributor', nameEn: 'Attestor', nameAr: 'مصدّق', isDefault: false, isSystem: true, isGlobal: false, permissions: ['attestation.read', 'attestation.record.manage'] },
        { roleCode: 'attestation.reviewer', archetype: 'approver', nameEn: 'Attestation Reviewer', nameAr: 'مراجع التصديق', isDefault: false, isSystem: true, isGlobal: false, permissions: ['attestation.read', 'attestation.record.review'] },
        { roleCode: 'attestation.admin', archetype: 'module_lead', nameEn: 'Attestation Admin', nameAr: 'مسؤول التصديق', isDefault: false, isSystem: true, isGlobal: false, permissions: ['attestation.read', 'attestation.campaign.manage', 'attestation.record.manage', 'attestation.record.review'] }
    ],
    securityActions: [
        { actionCode: 'attestation.campaign.create', labelEn: 'Create Campaign', labelAr: 'إنشاء حملة', requiredPermissions: ['attestation.campaign.manage'], dangerLevel: 'moderate', auditable: true, requiresWorkflow: false },
        { actionCode: 'attestation.record.submit', labelEn: 'Submit Attestation', labelAr: 'تقديم التصديق', requiredPermissions: ['attestation.record.manage'], dangerLevel: 'moderate', auditable: true },
        { actionCode: 'attestation.record.review', labelEn: 'Review Submission', labelAr: 'مراجعة التقديم', requiredPermissions: ['attestation.record.review'], dangerLevel: 'moderate', auditable: true, sodSensitive: true }
    ],
    approvalRules: [],
    ownershipRules: [],
    sodRules: [
        { ruleCode: 'attestation.sod.attestor_reviewer', descriptionEn: 'Attestor cannot review their own submission', descriptionAr: 'لا يمكن للمصدّق مراجعة تقديمه الخاص', conflictingRoles: [], conflictingActions: ['attestation.record.submit', 'attestation.record.review'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false }
    ]
};
(0, module_sdk_1.registerModule)(exports.ATTESTATION_MANIFEST);
//# sourceMappingURL=attestation.module.js.map