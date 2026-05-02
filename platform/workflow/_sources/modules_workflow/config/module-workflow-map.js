"use strict";
/**
 * Module Workflow Map — Maps module codes to their default workflow template codes.
 *
 * Used by the workflow engine to determine which template to instantiate
 * when a module triggers a workflow (e.g., policy approval, risk assessment review).
 *
 * This is the canonical map. Module manifests declare workflowTemplateCode,
 * and this map aggregates them for runtime lookup.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_WORKFLOW_MAP = void 0;
exports.registerModuleWorkflow = registerModuleWorkflow;
exports.getModuleWorkflowMapping = getModuleWorkflowMapping;
exports.getWorkflowTemplateForModule = getWorkflowTemplateForModule;
exports.getWorkflowEnabledModules = getWorkflowEnabledModules;
exports.isPlatformOnly = isPlatformOnly;
/**
 * Static map of module codes to their workflow configurations.
 * Populated from module manifests at build time and enriched at runtime
 * via registerModuleWorkflow().
 */
exports.MODULE_WORKFLOW_MAP = {
    policy: {
        moduleCode: 'policy',
        templateCode: 'policy_lifecycle',
        entityTypes: ['policy', 'policy_version'],
        slaHours: 72,
        autoAssign: false,
    },
    compliance: {
        moduleCode: 'compliance',
        templateCode: 'compliance_assessment',
        entityTypes: ['compliance_frameworks', 'compliance_assessments', 'compliance_findings'],
        slaHours: 48,
        autoAssign: false,
    },
    risk: {
        moduleCode: 'risk',
        templateCode: 'risk_assessment',
        entityTypes: ['risk_assessments', 'risk_treatment_plans'],
        slaHours: 48,
        autoAssign: false,
    },
    audit: {
        moduleCode: 'audit',
        templateCode: 'audit_lifecycle',
        entityTypes: ['audits', 'audit_findings'],
        slaHours: 120,
        autoAssign: false,
    },
    incident: {
        moduleCode: 'incident',
        templateCode: 'incident_response',
        entityTypes: ['incidents', 'incident_response_plans'],
        slaHours: 4,
        autoAssign: true,
    },
    vendor: {
        moduleCode: 'vendor',
        templateCode: 'vendor_assessment',
        entityTypes: ['vendor_assessments', 'vendor_due_diligence'],
        slaHours: 72,
        autoAssign: false,
    },
    evidence: {
        moduleCode: 'evidence',
        templateCode: 'evidence_collection',
        entityTypes: ['evidence_collection_jobs'],
        slaHours: 168,
        autoAssign: true,
    },
    controls: {
        moduleCode: 'controls',
        templateCode: 'control_testing',
        entityTypes: ['controls', 'control_test_procedures'],
        slaHours: 48,
        autoAssign: false,
    },
    governance: {
        moduleCode: 'governance',
        templateCode: 'governance_decision',
        entityTypes: ['governance_bodies', 'governance_charters', 'governance_mandates'],
        slaHours: 72,
        autoAssign: false,
    },
    exception: {
        moduleCode: 'exception',
        templateCode: 'exception_approval',
        entityTypes: ['policy_exception_requests'],
        slaHours: 48,
        autoAssign: false,
    },
    remediation: {
        moduleCode: 'remediation',
        templateCode: 'remediation_tracking',
        entityTypes: ['remediation_plans', 'remediation_actions'],
        slaHours: 168,
        autoAssign: true,
    },
    action: {
        moduleCode: 'action',
        templateCode: 'action_tracking',
        entityTypes: ['action_items'],
        slaHours: 168,
        autoAssign: true,
    },
    bcp: {
        moduleCode: 'bcp',
        templateCode: 'bcp_review',
        entityTypes: ['bcp_plans', 'bcp_impact_analysis'],
        slaHours: 168,
        autoAssign: false,
    },
    asset: {
        moduleCode: 'asset',
        templateCode: 'asset_lifecycle',
        entityTypes: ['asset_inventory'],
        slaHours: 72,
        autoAssign: false,
    },
    training: {
        moduleCode: 'training',
        templateCode: 'training_campaign',
        entityTypes: ['training_campaigns', 'training_assignments'],
        slaHours: 336,
        autoAssign: true,
    },
    privacy: {
        moduleCode: 'privacy',
        templateCode: 'privacy_assessment',
        entityTypes: ['privacy_pia', 'privacy_dsrs'],
        slaHours: 72,
        autoAssign: false,
    },
};
/**
 * Register a module's workflow mapping at runtime.
 * Called during module initialization.
 */
function registerModuleWorkflow(mapping) {
    exports.MODULE_WORKFLOW_MAP[mapping.moduleCode] = mapping;
}
/**
 * Get the workflow mapping for a module.
 */
function getModuleWorkflowMapping(moduleCode) {
    return exports.MODULE_WORKFLOW_MAP[moduleCode];
}
/**
 * Get the workflow template code for a module.
 */
function getWorkflowTemplateForModule(moduleCode) {
    return exports.MODULE_WORKFLOW_MAP[moduleCode]?.templateCode;
}
/**
 * Get all module codes that have workflow mappings.
 */
function getWorkflowEnabledModules() {
    return Object.keys(exports.MODULE_WORKFLOW_MAP);
}
/**
 * Platform-only modules have no workflow by design (R2) — dashboard,
 * navigation, admin-only utility surfaces. A request to start a workflow
 * against them is a hard error.
 *
 * Conservative default: any module code NOT present in MODULE_WORKFLOW_MAP
 * is treated as platform-only. This can be overridden at registration time
 * via `registerModuleWorkflow`.
 */
function isPlatformOnly(moduleCode) {
    return !(moduleCode in exports.MODULE_WORKFLOW_MAP);
}
