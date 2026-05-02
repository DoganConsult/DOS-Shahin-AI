"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLASSIFIED_MODULES = exports.EXTENDED_MODULES = exports.GRC_CORE_MODULES = exports.ALWAYS_ON_MODULES = exports.PLATFORM_CAPABILITY_CATALOG = void 0;
exports.getCapability = getCapability;
exports.getCapabilitiesByStatus = getCapabilitiesByStatus;
exports.getCapabilitiesByOwner = getCapabilitiesByOwner;
exports.validateCapabilityCatalog = validateCapabilityCatalog;
exports.resolveCapabilityDAG = resolveCapabilityDAG;
exports.validateCapabilityReadiness = validateCapabilityReadiness;
exports.getEffectiveModules = getEffectiveModules;
exports.getActiveModules = getActiveModules;
exports.checkRuntimeAccessGate = checkRuntimeAccessGate;
exports.getAllRegisteredModuleCodes = getAllRegisteredModuleCodes;
exports.getModuleCodesByTier = getModuleCodesByTier;
exports.validateRegistryAlignment = validateRegistryAlignment;
exports.registerEntityDescriptor = registerEntityDescriptor;
exports.resolveByEntity = resolveByEntity;
exports.listEntityDescriptors = listEntityDescriptors;
exports.isModuleActive = isModuleActive;
exports.getModuleState = getModuleState;
exports.updateModuleState = updateModuleState;
exports.getAllModuleStates = getAllModuleStates;
exports.PLATFORM_CAPABILITY_CATALOG = [
    { id: 'cap.identity', name: 'Identity & Authentication', description: 'JWT-based authentication, MFA, SSO integration', owner: 'platform', status: 'available', modules: ['foundation'], contracts: ['platform.auth'], dependencies: [] },
    { id: 'cap.rbac', name: 'Role-Based Access Control', description: 'Permission families, role assignments, dynamic RBAC', owner: 'platform', status: 'available', modules: ['foundation', 'admin'], contracts: ['platform.rbac'], dependencies: ['cap.identity'] },
    { id: 'cap.fga', name: 'Fine-Grained Authorization', description: 'OpenFGA-based relationship authorization', owner: 'platform', status: 'available', modules: ['foundation'], contracts: ['platform.openfga'], dependencies: ['cap.identity'] },
    { id: 'cap.tenant', name: 'Multi-Tenant Isolation', description: 'Schema-per-tenant isolation with tenant guard', owner: 'platform', status: 'available', modules: ['foundation', 'admin'], contracts: [], dependencies: ['cap.identity'] },
    { id: 'cap.workflow', name: 'Workflow Engine', description: 'Step-based state machine with SLA, approvals, conditions', owner: 'platform', status: 'available', modules: ['workflow'], contracts: ['platform.workflow-engine'], dependencies: [] },
    { id: 'cap.event-bus', name: 'Event Bus', description: 'In-process pub/sub event bus with typed events', owner: 'platform', status: 'available', modules: ['platform'], contracts: ['platform.event-bus'], dependencies: [] },
    { id: 'cap.notification', name: 'Notification Service', description: 'Multi-channel notifications (email, in-app, push)', owner: 'platform', status: 'available', modules: ['notification'], contracts: ['platform.notification'], dependencies: ['cap.event-bus'] },
    { id: 'cap.audit-trail', name: 'Audit Trail', description: 'Immutable action logging for compliance', owner: 'platform', status: 'available', modules: ['foundation'], contracts: ['platform.audit-trail'], dependencies: [] },
    { id: 'cap.file-storage', name: 'File Storage', description: 'Azure Blob / local file storage abstraction', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
    { id: 'cap.rule-engine', name: 'Rule Engine', description: 'Generic condition-action rule evaluation', owner: 'platform', status: 'available', modules: ['platform'], contracts: ['platform.rule-engine'], dependencies: ['cap.event-bus'] },
    { id: 'cap.task-inbox', name: 'Unified Task/Inbox', description: 'Cross-module task resolution API', owner: 'platform', status: 'planned', modules: ['inbox', 'workflow'], contracts: [], dependencies: ['cap.workflow'] },
    { id: 'cap.graph', name: 'Graph Relationships', description: 'Apache AGE entity relationship graph', owner: 'platform', status: 'available', modules: ['platform'], contracts: ['platform.graph-backend'], dependencies: [] },
    { id: 'cap.search', name: 'Search & Knowledge', description: 'Vector search and knowledge indexing', owner: 'platform', status: 'partial', modules: ['platform'], contracts: [], dependencies: [] },
    { id: 'cap.ai-gateway', name: 'AI Gateway', description: 'Multi-provider LLM routing with agent profiles', owner: 'platform', status: 'available', modules: ['ai'], contracts: [], dependencies: [] },
    { id: 'cap.queue', name: 'Message Queue', description: 'PGMQ-based durable message queue', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
    { id: 'cap.scheduler', name: 'Job Scheduler', description: 'Cron-based job scheduling with Temporal fallback', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
    { id: 'cap.contract-registry', name: 'Contract Registry', description: 'Versioned contract definitions between modules', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
    { id: 'cap.feature-flags', name: 'Feature Flags', description: 'Product and tenant-level feature toggles', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
    { id: 'cap.secrets', name: 'Secrets Management', description: 'Azure KeyVault integration for secret storage', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
    { id: 'cap.openapi', name: 'OpenAPI Documentation', description: 'Auto-generated OpenAPI 3.0 spec from JSDoc', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
    { id: 'cap.visual-workflow', name: 'Visual Workflow Builder', description: 'Drag-and-drop workflow/form designer', owner: 'platform', status: 'planned', modules: ['workflow'], contracts: [], dependencies: ['cap.workflow'] },
    { id: 'cap.billing', name: 'Subscription & Billing', description: 'Subscription lifecycle, entitlements, usage metering', owner: 'platform', status: 'partial', modules: ['admin'], contracts: [], dependencies: ['cap.tenant'] },
];
/**
 * Modules whose permissions are always granted regardless of
 * tenant_module_entitlements rows. Used by the DAuth decision engine's
 * step 5 (product_enabled) to short-circuit the entitlement check for
 * platform primitives.
 *
 * Every entry MUST correspond to a real `<module>.*.*` permission code
 * somewhere in services/auth-service/src/domain/access/rbac/
 * canonical-permissions.ts. Historical entries that never had seeded
 * permissions (tenancy, settings, notifications plural) have been
 * removed — they never affected runtime and broke the
 * "tenant_admin covers all ALWAYS_ON" invariant in
 * seed-rbac-data.test.ts.
 */
exports.ALWAYS_ON_MODULES = new Set([
    'platform', 'dauth', 'profile', 'navigation',
    'workspace', 'admin', 'onboarding',
    // Cross-cutting always-on capabilities referenced by seeded permissions.
    'access', 'agent', 'bootstrap', 'delegation', 'event', 'foundation',
    'gate', 'notification', 'provisioning', 'security', 'shell', 'telemetry',
    'tenant', 'users',
]);
exports.GRC_CORE_MODULES = new Set([
    'governance', 'risk', 'compliance', 'controls', 'evidence',
    'audit', 'reporting', 'vendor', 'incident', 'regulatory',
    // Adjacent GRC domains that consume the same decision-engine surface
    // as the six canonical GRC-core modules above — treated as GRC-core
    // for classification / fallback purposes.
    'policy', 'exception', 'action', 'remediation', 'issues', 'assessment',
    'framework', 'control', 'privacy', 'attestation', 'record', 'records',
    'obligation', 'maturity', 'ccm', 'dora',
]);
/**
 * EXTENDED_MODULES — non-Wave-1 feature surfaces that ship seeded
 * permissions because their code is present in the repo, but which are
 * hidden from users in Wave 1 via Shahin nav filtering + backend
 * permission checks + gateway AI safety flag.
 *
 * Present so the RBAC seed's permission map is self-consistent (every
 * moduleCode that appears in a permission prefix must be classified).
 * Wave 1 does NOT surface these routes to users; their tenant_module
 * _entitlements rows stay off and the DAuth decision-engine denies at
 * step 5 (product_enabled).
 */
exports.EXTENDED_MODULES = new Set([
    // AI / Copilot — gated by AI_ENABLED=false in Wave 1
    'ai', 'ai-governance', 'ai_governance', 'ai_squad', 'agrc_engine',
    'copilot', 'governance_ai', 'governance_os', 'knowledge',
    'local_knowledge', 'ksa_regulatory',
    // Hidden product modules
    'asset', 'bcp', 'dashboard', 'widgets', 'integrations', 'training',
    'qiyas', 'portals', 'packs', 'fitch', 'inbox', 'position', 'team',
    // Reporting / analytics / exec dashboards
    'analytics', 'benchmarks', 'executive', 'report', 'reports', 'timeline',
    'task', 'messaging', 'journey', 'sop', 'document', 'runbook',
    // Workflow runtime (Wave 1 certified surface only — extended variants)
    'workflow', 'proactive_leadership',
]);
/**
 * Complete module classification. A permission's moduleCode MUST fall
 * into one of the three buckets above; otherwise it is "orphan" and the
 * seed-rbac-data.test.ts invariant will surface it.
 */
exports.CLASSIFIED_MODULES = new Set([
    ...exports.ALWAYS_ON_MODULES,
    ...exports.GRC_CORE_MODULES,
    ...exports.EXTENDED_MODULES,
]);
function getCapability(id) {
    return exports.PLATFORM_CAPABILITY_CATALOG.find(c => c.id === id);
}
function getCapabilitiesByStatus(status) {
    return exports.PLATFORM_CAPABILITY_CATALOG.filter(c => c.status === status);
}
function getCapabilitiesByOwner(owner) {
    return exports.PLATFORM_CAPABILITY_CATALOG.filter(c => c.owner === owner);
}
function validateCapabilityCatalog() {
    const errors = [];
    const ids = new Set();
    for (const capability of exports.PLATFORM_CAPABILITY_CATALOG) {
        if (ids.has(capability.id)) {
            errors.push(`Duplicate capability ID: ${capability.id}`);
        }
        ids.add(capability.id);
        for (const dependency of capability.dependencies) {
            if (!exports.PLATFORM_CAPABILITY_CATALOG.find(c => c.id === dependency)) {
                errors.push(`Capability '${capability.id}' depends on unknown capability '${dependency}'`);
            }
        }
    }
    return errors;
}
function resolveCapabilityDAG(capabilityIds) {
    const resolved = new Map();
    const visiting = new Set();
    function visit(id) {
        if (resolved.has(id))
            return;
        if (visiting.has(id)) {
            throw new Error(`[CapabilityDAG] Circular dependency detected at capability: ${id}`);
        }
        visiting.add(id);
        const capability = exports.PLATFORM_CAPABILITY_CATALOG.find(c => c.id === id);
        if (!capability) {
            throw new Error(`[CapabilityDAG] Unknown capability: ${id}`);
        }
        for (const dependency of capability.dependencies) {
            visit(dependency);
        }
        visiting.delete(id);
        resolved.set(id, capability);
    }
    for (const capabilityId of capabilityIds) {
        visit(capabilityId);
    }
    return Array.from(resolved.values());
}
function validateCapabilityReadiness(moduleCodes) {
    const required = exports.PLATFORM_CAPABILITY_CATALOG.filter(capability => capability.modules.some(moduleCode => moduleCodes.includes(moduleCode)));
    const notReady = required.filter(capability => capability.status === 'not_started');
    if (notReady.length > 0) {
        const list = notReady.map(capability => `${capability.id} (${capability.name})`).join(', ');
        throw new Error(`[CapabilityReadiness] The following required capabilities are not started: ${list}`);
    }
    const broken = required.filter(capability => capability.dependencies.some(dependency => {
        const dependencyCapability = exports.PLATFORM_CAPABILITY_CATALOG.find(entry => entry.id === dependency);
        return dependencyCapability?.status === 'not_started';
    }));
    if (broken.length > 0) {
        const list = broken.map(capability => `${capability.id} depends on unready: ${capability.dependencies.join(', ')}`).join('; ');
        throw new Error(`[CapabilityReadiness] Capability dependency gap: ${list}`);
    }
}
function getEffectiveModules(_tenantId, _userId) {
    return { modules: [...exports.ALWAYS_ON_MODULES, ...exports.GRC_CORE_MODULES] };
}
async function getActiveModules(tenantId, userId) {
    return getEffectiveModules(tenantId, userId).modules;
}
async function checkRuntimeAccessGate(tenantId, moduleCode) {
    const { modules } = getEffectiveModules(tenantId);
    if (modules.includes(moduleCode)) {
        return { allowed: true, reason: 'OK' };
    }
    return { allowed: false, reason: 'MODULE_NOT_ENABLED' };
}
function getAllRegisteredModuleCodes() {
    return [...exports.ALWAYS_ON_MODULES, ...exports.GRC_CORE_MODULES];
}
function getModuleCodesByTier(tier) {
    if (tier === 'core')
        return [...exports.GRC_CORE_MODULES];
    if (tier === 'platform')
        return [...exports.ALWAYS_ON_MODULES];
    return getAllRegisteredModuleCodes();
}
function validateRegistryAlignment(_codes) {
    const registered = new Set(getAllRegisteredModuleCodes());
    const missing = _codes.filter(c => !registered.has(c));
    const extra = [...registered].filter(c => !_codes.includes(c));
    return { valid: missing.length === 0, missing, extra };
}
const _entityDescriptorRegistry = new Map();
function registerEntityDescriptor(descriptor) {
    _entityDescriptorRegistry.set(descriptor.entityType, descriptor);
}
function resolveByEntity(entityType) {
    return _entityDescriptorRegistry.get(entityType);
}
function listEntityDescriptors() {
    return Array.from(_entityDescriptorRegistry.values());
}
// Module state shim — the canonical services are in ai-engine-service; modules
// import these stubs to satisfy typecheck until full extraction lands.
async function isModuleActive(..._args) { return true; }
async function getModuleState(..._args) { return { state: 'active' }; }
async function updateModuleState(..._args) { }
async function getAllModuleStates(..._args) { return []; }
//# sourceMappingURL=index.js.map