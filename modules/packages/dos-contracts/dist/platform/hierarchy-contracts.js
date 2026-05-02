"use strict";
/**
 * Canonical Hierarchy Contracts v1
 *
 * Defines the authoritative Platform → Product → Module → Tenant → User
 * hierarchy with Subscription as a side-layer attached to Tenant/Product/Module
 * entitlement (never part of user identity).
 *
 * Rules enforced:
 *   1. Platform ≠ Product  — platform stays product-neutral
 *   2. Tenant ≠ Product    — tenant config holds overrides, not product defaults
 *   3. Subscription ≠ RBAC — subscription gates entitlement, RBAC gates access
 *   4. Workspace settings ≠ Shahin settings
 *
 * Canonical order: Platform → Product → Module → Tenant → User
 * Side-layer:      Subscription (attached to Tenant + Product + Module)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIERARCHY_RULES = exports.EDGE_MODULE_CODES = exports.PRODUCT_MODULE_CODES = exports.PLATFORM_AI_MODULE_CODES = exports.PLATFORM_MODULE_CODES = exports.HIERARCHY_GOVERNANCE_MODEL = exports.HIERARCHY_SIDE_LAYERS = exports.HIERARCHY_ORDER = void 0;
exports.isPlatformModule = isPlatformModule;
exports.isProductModule = isProductModule;
exports.isEdgeModule = isEdgeModule;
exports.getModuleHierarchyLayer = getModuleHierarchyLayer;
exports.describeHierarchy = describeHierarchy;
exports.HIERARCHY_ORDER = [
    'platform',
    'product',
    'module',
    'tenant',
    'user',
];
exports.HIERARCHY_SIDE_LAYERS = [
    'subscription',
];
exports.HIERARCHY_GOVERNANCE_MODEL = {
    platform: {
        layer: 'platform',
        owner: 'platform-engineering',
        scope: 'global / all tenants',
        data: 'identity, RBAC, audit, workflow, files, notifications, AI gateway, settings, billing, tenant/workspace management',
        permissions: 'platform:admin, platform:operate',
        examples: ['auth', 'workspace', 'workflow-engine', 'notification-bus', 'AI-gateway', 'file-storage'],
    },
    product: {
        layer: 'product',
        owner: 'product-team',
        scope: 'per product (e.g. Shahin)',
        data: 'module definitions, seed data, default workflows, agent profiles, RBAC defaults, nav items, KPIs',
        permissions: 'product:register, product:configure',
        examples: ['Shahin-Ai product pack', 'agrc-product.definition.ts', 'agrc-agents.ts'],
    },
    module: {
        layer: 'module',
        owner: 'module-team / product-team',
        scope: 'per module within a product',
        data: 'routes, services, tables, UI, workflows, permissions, events',
        permissions: '<module>:read, <module>:write, <module>:admin',
        examples: ['governance', 'risk', 'compliance', 'evidence', 'audit', 'workflow (platform)', 'notification (platform)'],
    },
    tenant: {
        layer: 'tenant',
        owner: 'tenant-admin',
        scope: 'per customer workspace/org',
        data: 'enabled modules, allowed AI providers, onboarding mode, workflow toggles, branding, preferences',
        permissions: 'tenant:manage, tenant:configure',
        examples: ['tenant_config overrides', 'branding', 'enabled module list', 'MFA policy'],
    },
    user: {
        layer: 'user',
        owner: 'identity / foundation module',
        scope: 'per user within tenant',
        data: 'tenant membership, roles, permissions, scope, authority/delegation',
        permissions: 'user:self, user:manage (admin)',
        examples: ['role assignment', 'permission grants', 'delegation of authority', 'team membership'],
    },
    subscription: {
        layer: 'subscription',
        owner: 'billing / commercial',
        scope: 'side-layer on tenant + product + module',
        data: 'product activation, plan level, licensed modules, usage caps, billing state',
        permissions: 'subscription:view, subscription:manage (billing admin)',
        examples: ['starter plan', 'scale plan', 'continuous plan', 'module license', 'usage quota'],
    },
};
exports.PLATFORM_MODULE_CODES = [
    'foundation', 'admin', 'workflow', 'notification', 'team', 'inbox',
];
exports.PLATFORM_AI_MODULE_CODES = [
    'ai', 'ai-governance',
];
exports.PRODUCT_MODULE_CODES = [
    'governance', 'risk', 'compliance', 'policy', 'evidence', 'audit',
    'incident', 'exception', 'vendor', 'bcp', 'asset', 'remediation',
    'action', 'training', 'qiyas', 'reporting', 'analytics',
    'issues', 'records', 'privacy',
];
exports.EDGE_MODULE_CODES = [
    'integrations', 'portals',
];
const _PLATFORM_SET = new Set([...exports.PLATFORM_MODULE_CODES, ...exports.PLATFORM_AI_MODULE_CODES]);
const _PRODUCT_SET = new Set(exports.PRODUCT_MODULE_CODES);
const _EDGE_SET = new Set(exports.EDGE_MODULE_CODES);
function isPlatformModule(code) {
    return _PLATFORM_SET.has(code);
}
function isProductModule(code) {
    return _PRODUCT_SET.has(code);
}
function isEdgeModule(code) {
    return _EDGE_SET.has(code);
}
function getModuleHierarchyLayer(code) {
    if (_PLATFORM_SET.has(code))
        return 'platform';
    if (_PRODUCT_SET.has(code))
        return 'product';
    if (_EDGE_SET.has(code))
        return 'product';
    return 'module';
}
exports.HIERARCHY_RULES = {
    platform_depends_on_product: 'Platform code must not import or depend on product code except at composition root for activation wiring.',
    tenant_config_has_product_defaults: 'Tenant config must hold tenant-specific overrides only, not product defaults.',
    subscription_replaces_rbac: 'Subscription gates entitlement (what is licensed), RBAC gates access (who can do what). Never merge them.',
    workspace_settings_mixed_with_product: 'Workspace/platform settings must stay separate from product (Shahin) settings.',
    user_role_mixed_with_tenant_plan: 'User role/identity must not be conflated with tenant plan or module ownership.',
    module_boundary_leak: 'Module boundaries must stay truthful. No permission leakage or fake ownership borrowing across modules.',
};
function describeHierarchy() {
    return exports.HIERARCHY_ORDER
        .map((layer, i) => `${i + 1}. ${layer.charAt(0).toUpperCase() + layer.slice(1)}`)
        .join(' → ')
        + ` | Side-layer: ${exports.HIERARCHY_SIDE_LAYERS.join(', ')}`;
}
//# sourceMappingURL=hierarchy-contracts.js.map