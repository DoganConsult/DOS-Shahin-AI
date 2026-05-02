"use strict";
// @ts-nocheck — platform validation tool, stabilizing incrementally
/**
 * Canonical Ownership Matrix — single source of truth for module/directory classification.
 *
 * Every module directory and canonical module code maps to exactly one ownership tier.
 * Used by:
 *   - Service taxonomy collapse (Pass 3) — determines where root services should move
 *   - Route surface classification (Pass 4) — determines route surface type
 *   - Permission audit (Pass 5) — validates permission family alignment
 *   - Drift tests — ensures no orphan directories or unclassified modules
 *
 * TIERS:
 *   platform-core    — always-on infrastructure (auth, workspace, org, workflow, notifications)
 *   platform-ai      — AI operating layer (agents, LLM, LangGraph, AI governance)
 *   product-agrc     — Shahin-Ai product domains (risk, compliance, audit, governance, etc.)
 *   edge-external    — external portal surfaces (integrations, vendor portal, regulator portal)
 *   shared-internal  — cross-cutting adapters, connectors, utilities (no business ownership)
 *
 * HIERARCHY: Platform → Product → Module → Tenant → User
 * Subscription is a side-layer. See platform/hierarchy-contracts.ts.
 *
 * SEPARATION RULES:
 *   - platform ≠ product: platform-core/platform-ai must NOT depend on product-agrc
 *   - tenant ≠ product:   tenant config holds overrides, product config holds defaults
 *   - subscription ≠ RBAC: subscription gates entitlement, RBAC gates access
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIRECTORY_OWNERSHIP = void 0;
exports.getModuleOwnership = getModuleOwnership;
exports.getModulesByTier = getModulesByTier;
exports.getDirectoryTier = getDirectoryTier;
exports.getAllModuleOwnership = getAllModuleOwnership;
exports.validateOwnershipCompleteness = validateOwnershipCompleteness;
exports.getModulesByHierarchyLayer = getModulesByHierarchyLayer;
exports.validateHierarchyLayerConsistency = validateHierarchyLayerConsistency;
// ── Canonical Module Ownership (32 frozen codes) ────────────────────────
const CANONICAL_OWNERSHIP = {
    // ── Platform Core (always-on infrastructure) ── hierarchyLayer: 'platform'
    foundation: { code: 'foundation', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'platform/dos/foundation', mountPrefix: '/api/foundation', permissionFamily: 'foundation', eventNamespace: 'foundation', labelEn: 'Organization & Users' },
    admin: { code: 'admin', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/admin/services', mountPrefix: '/api/admin', permissionFamily: 'admin', eventNamespace: 'admin', labelEn: 'Administration' },
    workflow: { code: 'workflow', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/workflow/services', mountPrefix: '/api/workflows', permissionFamily: 'workflow', eventNamespace: 'workflow', labelEn: 'Workflows & Automation' },
    notification: { code: 'notification', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/notification/services', mountPrefix: '/api/notifications', permissionFamily: 'notification', eventNamespace: 'notification', labelEn: 'Notifications' },
    team: { code: 'team', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'platform/dos/foundation', mountPrefix: '/api/teams', permissionFamily: 'team', eventNamespace: 'team', labelEn: 'Teams' },
    // ── Platform AI (AI operating layer) ── hierarchyLayer: 'platform'
    ai: { code: 'ai', tier: 'platform-ai', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/ai/services', mountPrefix: '/api/ai', permissionFamily: 'ai', eventNamespace: 'ai', labelEn: 'AI Agents & Copilot' },
    'ai-governance': { code: 'ai-governance', tier: 'platform-ai', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/ai-governance/services', mountPrefix: '/api/ai-governance', permissionFamily: 'ai-governance', eventNamespace: 'ai_governance', labelEn: 'AI Governance' },
    // ── Product AGRC (Shahin-Ai business domains) ── hierarchyLayer: 'product'
    risk: { code: 'risk', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/risk/services', mountPrefix: '/api/risks', permissionFamily: 'risk', eventNamespace: 'risk', labelEn: 'Risk Management' },
    compliance: { code: 'compliance', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/compliance/services', mountPrefix: '/api/compliance', permissionFamily: 'compliance', eventNamespace: 'compliance', labelEn: 'Compliance' },
    policy: { code: 'policy', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/policy/services', mountPrefix: '/api/policies', permissionFamily: 'policy', eventNamespace: 'policy', labelEn: 'Policy Management' },
    evidence: { code: 'evidence', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/evidence/services', mountPrefix: '/api/evidence', permissionFamily: 'evidence', eventNamespace: 'evidence', labelEn: 'Evidence Management' },
    audit: { code: 'audit', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/audit/services', mountPrefix: '/api/audit', permissionFamily: 'audit', eventNamespace: 'audit', labelEn: 'Audit' },
    incident: { code: 'incident', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/incident/services', mountPrefix: '/api/incidents', permissionFamily: 'incident', eventNamespace: 'incident', labelEn: 'Incident Management' },
    exception: { code: 'exception', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/exception/services', mountPrefix: '/api/exceptions', permissionFamily: 'exception', eventNamespace: 'exception', labelEn: 'Exception Management' },
    governance: { code: 'governance', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/governance/services', mountPrefix: '/api/governance', permissionFamily: 'governance', eventNamespace: 'governance', labelEn: 'Governance' },
    vendor: { code: 'vendor', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/vendor/services', mountPrefix: '/api/vendors', permissionFamily: 'vendor', eventNamespace: 'vendor', labelEn: 'Vendor Management' },
    bcp: { code: 'bcp', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/bcp/services', mountPrefix: '/api/bcp', permissionFamily: 'bcp', eventNamespace: 'bcp', labelEn: 'Business Continuity' },
    asset: { code: 'asset', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/asset/services', mountPrefix: '/api/assets', permissionFamily: 'asset', eventNamespace: 'asset', labelEn: 'Asset Management' },
    remediation: { code: 'remediation', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/remediation/services', mountPrefix: '/api/remediation', permissionFamily: 'remediation', eventNamespace: 'remediation', labelEn: 'Remediation' },
    action: { code: 'action', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/action/services', mountPrefix: '/api/action-items', permissionFamily: 'action', eventNamespace: 'action', labelEn: 'Action Items' },
    training: { code: 'training', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/training/services', mountPrefix: '/api/training', permissionFamily: 'training', eventNamespace: 'training', labelEn: 'Training & Awareness' },
    qiyas: { code: 'qiyas', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/qiyas/services', mountPrefix: '/api/qiyas', permissionFamily: 'qiyas', eventNamespace: 'qiyas', labelEn: 'Qiyas Assessment' },
    reporting: { code: 'reporting', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/reporting/services', mountPrefix: '/api/reports', permissionFamily: 'reporting', eventNamespace: 'reporting', labelEn: 'Reporting' },
    analytics: { code: 'analytics', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/analytics/services', mountPrefix: '/api/analytics', permissionFamily: 'analytics', eventNamespace: 'analytics', labelEn: 'Analytics & KPIs' },
    // ── Edge / External ───────────────────────────────────────────────────
    integrations: { code: 'integrations', tier: 'edge-external', hierarchyLayer: 'product', canonicalServiceDir: 'modules/integrations/services', mountPrefix: '/api/integrations', permissionFamily: 'integrations', eventNamespace: 'integrations', labelEn: 'Integrations' },
    // ── Extended Modules ───────────────────────────────────────────────────
    issues: { code: 'issues', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/issues/services', mountPrefix: '/api/issues', permissionFamily: 'issues', eventNamespace: 'issues', labelEn: 'Issue Tracking' },
    inbox: { code: 'inbox', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/inbox/services', mountPrefix: '/api/inbox', permissionFamily: 'inbox', eventNamespace: 'inbox', labelEn: 'Inbox & Messages' },
    portals: { code: 'portals', tier: 'edge-external', hierarchyLayer: 'product', canonicalServiceDir: 'modules/portals/services', mountPrefix: '/api/portals', permissionFamily: 'portals', eventNamespace: 'portals', labelEn: 'External Portals' },
    records: { code: 'records', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/records/services', mountPrefix: '/api/records', permissionFamily: 'records', eventNamespace: 'records', labelEn: 'Records Management' },
    privacy: { code: 'privacy', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/privacy/services', mountPrefix: '/api/privacy', permissionFamily: 'privacy', eventNamespace: 'privacy', labelEn: 'Privacy & PDPL' },
    controls: { code: 'controls', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/controls/services', mountPrefix: '/api/controls', permissionFamily: 'controls', eventNamespace: 'controls', labelEn: 'Controls Management' },
    onboarding: { code: 'onboarding', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/onboarding/services', mountPrefix: '/api/onboarding', permissionFamily: 'onboarding', eventNamespace: 'onboarding', labelEn: 'Tenant Onboarding' },
    dora: { code: 'dora', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/dora/services', mountPrefix: '/api/dora', permissionFamily: 'dora', eventNamespace: 'dora', labelEn: 'DORA Compliance' },
    journey: { code: 'journey', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/journey/services', mountPrefix: '/api/journey', permissionFamily: 'journey', eventNamespace: 'journey', labelEn: 'GRC Journey & Maturity' },
    'ksa-regulatory': { code: 'ksa-regulatory', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/ksa-regulatory/services', mountPrefix: '/api/ksa-regulatory', permissionFamily: 'ksa-regulatory', eventNamespace: 'ksa_regulatory', labelEn: 'KSA Regulatory' },
    'local-knowledge': { code: 'local-knowledge', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/local-knowledge/services', mountPrefix: '/api/local-knowledge', permissionFamily: 'local-knowledge', eventNamespace: 'local_knowledge', labelEn: 'Local Knowledge' },
    packs: { code: 'packs', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/packs/services', mountPrefix: '/api/packs', permissionFamily: 'packs', eventNamespace: 'packs', labelEn: 'Content Packs' },
    'proactive-leadership': { code: 'proactive-leadership', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/proactive-leadership/services', mountPrefix: '/api/proactive-leadership', permissionFamily: 'proactive-leadership', eventNamespace: 'proactive_leadership', labelEn: 'Proactive Leadership' },
    'agrc-engine': { code: 'agrc-engine', tier: 'platform-ai', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/agrc-engine/services', mountPrefix: '/api/agrc-engine', permissionFamily: 'agrc-engine', eventNamespace: 'agrc_engine', labelEn: 'AGRC Engine' },
    dashboard: { code: 'dashboard', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/dashboard/services', mountPrefix: '/api/dashboard', permissionFamily: 'dashboard', eventNamespace: 'dashboard', labelEn: 'Dashboard' },
    'governance-ai': { code: 'governance-ai', tier: 'platform-ai', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/governance-ai/services', mountPrefix: '/api/governance-ai', permissionFamily: 'governance-ai', eventNamespace: 'governance_ai', labelEn: 'Governance AI' },
    'governance-os': { code: 'governance-os', tier: 'product-agrc', hierarchyLayer: 'product', canonicalServiceDir: 'modules/governance-os/services', mountPrefix: '/api/governance-os', permissionFamily: 'governance-os', eventNamespace: 'governance_os', labelEn: 'Governance OS' },
    provisioning: { code: 'provisioning', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/provisioning/services', mountPrefix: '/api/provisioning', permissionFamily: 'provisioning', eventNamespace: 'provisioning', labelEn: 'Provisioning' },
    navigation: { code: 'navigation', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/navigation/services', mountPrefix: '/api/navigation', permissionFamily: 'navigation', eventNamespace: 'navigation', labelEn: 'Navigation' },
    bootstrap: { code: 'bootstrap', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/bootstrap/services', mountPrefix: '/api/bootstrap', permissionFamily: 'bootstrap', eventNamespace: 'bootstrap', labelEn: 'Bootstrap' },
    widgets: { code: 'widgets', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/widgets/services', mountPrefix: '/api/widgets', permissionFamily: 'widgets', eventNamespace: 'widgets', labelEn: 'Widgets' },
    'quality-gate': { code: 'quality-gate', tier: 'platform-core', hierarchyLayer: 'platform', canonicalServiceDir: 'modules/quality-gate/services', mountPrefix: '/api/quality-gate', permissionFamily: 'quality-gate', eventNamespace: 'quality_gate', labelEn: 'Quality Gate' },
};
exports.DIRECTORY_OWNERSHIP = [
    // Platform infrastructure
    { directory: 'modules/platform', tier: 'platform-core', description: 'Platform infrastructure services' },
    { directory: 'modules/bootstrap', tier: 'platform-core', description: 'Workspace bootstrap orchestration' },
    // onboarding: now canonical — see CANONICAL_OWNERSHIP
    { directory: 'modules/provisioning', tier: 'platform-core', description: 'Workspace provisioning engine' },
    { directory: 'modules/navigation', tier: 'platform-core', description: 'Navigation registry & seeding' },
    { directory: 'modules/packs', tier: 'platform-core', description: 'Content pack installer' },
    { directory: 'modules/middleware', tier: 'platform-core', description: 'Module-level middleware' },
    // Platform AI
    { directory: 'langgraph', tier: 'platform-ai', description: 'LangGraph agent graphs & observability' },
    { directory: 'ai', tier: 'platform-ai', description: 'AI infrastructure (chains, tools, streaming)' },
    { directory: 'temporal', tier: 'platform-ai', description: 'Temporal workflow engine & distributed orchestration' },
    { directory: 'mcp', tier: 'platform-ai', description: 'Model Context Protocol server & integrations' },
    // Product extensions (serve canonical modules)
    { directory: 'modules/agrc-engine', tier: 'product-agrc', description: 'Autonomous GRC engine' },
    { directory: 'modules/governance-ai', tier: 'product-agrc', parentModule: 'governance', description: 'AI-powered governance signals' },
    { directory: 'modules/governance-os', tier: 'product-agrc', parentModule: 'governance', description: 'Governance operating system' },
    { directory: 'modules/ksa-regulatory', tier: 'product-agrc', parentModule: 'compliance', description: 'KSA regulatory intelligence' },
    { directory: 'modules/local-knowledge', tier: 'product-agrc', description: 'Document knowledge base' },
    { directory: 'modules/proactive-leadership', tier: 'product-agrc', description: 'Proactive leadership engine' },
    { directory: 'modules/widgets', tier: 'product-agrc', description: 'Dashboard widgets' },
    // controls: now canonical — see CANONICAL_OWNERSHIP
    // Edge / external
    { directory: 'modules/dashboard', tier: 'edge-external', description: 'Dashboard infrastructure (shared)' },
    // Shared internal
    { directory: 'connectors', tier: 'shared-internal', description: 'External system adapters' },
    { directory: 'shared', tier: 'shared-internal', description: 'Cross-hub utilities' },
    { directory: 'modules/_shared', tier: 'shared-internal', description: 'Shared module utilities' },
    // Platform infrastructure directories
    { directory: 'config', tier: 'platform-core', description: 'Application configuration (DB, Redis, JWT, tracing)' },
    { directory: 'middleware', tier: 'platform-core', description: 'Express middleware (auth, RBAC, rate limiting, audit)' },
    { directory: 'migrations', tier: 'platform-core', description: 'Database schema migrations (master + tenant)' },
    { directory: 'products', tier: 'platform-core', description: 'Product definitions (AGRC product pack)' },
    { directory: 'platform', tier: 'platform-core', description: 'Platform registries, catalogs, and RBAC infrastructure' },
    { directory: 'openclaw', tier: 'platform-core', description: 'OpenClaw regulatory content syndication server' },
    // Shared infrastructure directories
    { directory: 'errors', tier: 'shared-internal', description: 'Error class definitions' },
    { directory: 'i18n', tier: 'shared-internal', description: 'Internationalization (error messages, labels)' },
    { directory: 'types', tier: 'shared-internal', description: 'Shared TypeScript type definitions' },
    { directory: 'utils', tier: 'shared-internal', description: 'Shared utility functions' },
    { directory: 'data', tier: 'shared-internal', description: 'Seed data and templates' },
    { directory: 'tests', tier: 'shared-internal', description: 'Test suites and fixtures' },
    { directory: 'scripts', tier: 'shared-internal', description: 'Maintenance and build scripts' },
    { directory: 'tools', tier: 'shared-internal', description: 'Development and upgrade tools' },
    // Legacy (remaining non-shim routes to be moved)
    { directory: 'modules/modules', tier: 'shared-internal', description: 'LEGACY: nested module re-exports' },
    { directory: 'routes', tier: 'shared-internal', description: 'LEGACY: non-shim routes (36 files to be moved)' },
];
const REGISTERED_MODULE_CODES = Object.freeze(Object.keys(CANONICAL_OWNERSHIP));
// ── Query Helpers ───────────────────────────────────────────────────────
/** Get ownership entry for a canonical module code. */
function getModuleOwnership(code) {
    return CANONICAL_OWNERSHIP[code];
}
/** Get all modules belonging to a given tier. */
function getModulesByTier(tier) {
    return Object.values(CANONICAL_OWNERSHIP).filter(m => m.tier === tier);
}
/** Get ownership tier for a directory path (relative to backend/src/). */
function getDirectoryTier(directory) {
    const entry = exports.DIRECTORY_OWNERSHIP.find(d => directory.startsWith(d.directory));
    return entry?.tier;
}
/** Get all canonical module ownership entries. */
function getAllModuleOwnership() {
    return { ...CANONICAL_OWNERSHIP };
}
/** Validate that all 25 canonical codes are covered. Throws if any are missing. */
function validateOwnershipCompleteness() {
    const errors = [];
    for (const code of REGISTERED_MODULE_CODES) {
        if (!CANONICAL_OWNERSHIP[code]) {
            errors.push(`Missing ownership entry for canonical module: ${code}`);
        }
    }
    return errors;
}
/** Get all modules belonging to a given hierarchy layer. */
function getModulesByHierarchyLayer(layer) {
    return Object.values(CANONICAL_OWNERSHIP).filter(m => m.hierarchyLayer === layer);
}
/** Validate hierarchy layer consistency: tier and hierarchyLayer must agree. */
function validateHierarchyLayerConsistency() {
    const errors = [];
    const tierToLayer = {
        'platform-core': 'platform',
        'platform-ai': 'platform',
        'product-agrc': 'product',
        'edge-external': 'product',
        'shared-internal': 'platform',
    };
    for (const code of REGISTERED_MODULE_CODES) {
        const entry = CANONICAL_OWNERSHIP[code];
        if (!entry)
            continue;
        const expectedLayer = tierToLayer[entry.tier];
        if (entry.hierarchyLayer !== expectedLayer) {
            errors.push(`Hierarchy layer mismatch for ${code}: tier '${entry.tier}' expects layer '${expectedLayer}', got '${entry.hierarchyLayer}'`);
        }
    }
    return errors;
}
//# sourceMappingURL=ownership-matrix.js.map