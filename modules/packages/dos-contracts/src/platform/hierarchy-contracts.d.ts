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
export type HierarchyLayer = 'platform' | 'product' | 'module' | 'tenant' | 'user';
export type HierarchySideLayer = 'subscription';
export declare const HIERARCHY_ORDER: readonly HierarchyLayer[];
export declare const HIERARCHY_SIDE_LAYERS: readonly HierarchySideLayer[];
export interface HierarchyObjectContract {
    layer: HierarchyLayer | HierarchySideLayer;
    owner: string;
    scope: string;
    data: string;
    permissions: string;
    examples: string[];
}
export declare const HIERARCHY_GOVERNANCE_MODEL: Record<HierarchyLayer | HierarchySideLayer, HierarchyObjectContract>;
export type PlatformModuleCode = 'foundation' | 'admin' | 'workflow' | 'notification' | 'team' | 'inbox';
export type PlatformAiModuleCode = 'ai' | 'ai-governance';
export type ProductModuleCode = 'governance' | 'risk' | 'compliance' | 'policy' | 'evidence' | 'audit' | 'incident' | 'exception' | 'vendor' | 'bcp' | 'asset' | 'remediation' | 'action' | 'training' | 'qiyas' | 'reporting' | 'analytics' | 'issues' | 'records' | 'privacy';
export type EdgeModuleCode = 'integrations' | 'portals';
export type AllModuleCode = PlatformModuleCode | PlatformAiModuleCode | ProductModuleCode | EdgeModuleCode;
export declare const PLATFORM_MODULE_CODES: readonly PlatformModuleCode[];
export declare const PLATFORM_AI_MODULE_CODES: readonly PlatformAiModuleCode[];
export declare const PRODUCT_MODULE_CODES: readonly ProductModuleCode[];
export declare const EDGE_MODULE_CODES: readonly EdgeModuleCode[];
export declare function isPlatformModule(code: string): code is PlatformModuleCode | PlatformAiModuleCode;
export declare function isProductModule(code: string): code is ProductModuleCode;
export declare function isEdgeModule(code: string): code is EdgeModuleCode;
export declare function getModuleHierarchyLayer(code: string): HierarchyLayer;
export interface TenantConfigScope {
    enabledModules: string[];
    allowedAiProviders: string[];
    onboardingMode: string;
    workflowToggles: Record<string, boolean>;
    branding: Record<string, string>;
    preferences: Record<string, unknown>;
}
export interface SubscriptionEntitlement {
    tenantId: string;
    productKey: string;
    planLevel: string;
    licensedModules: string[];
    usageCaps: Record<string, number>;
    billingState: string;
}
export interface UserIdentity {
    userId: string;
    tenantId: string;
    roles: string[];
    permissions: string[];
    scope: string;
    delegations: string[];
}
export type HierarchyViolation = 'platform_depends_on_product' | 'tenant_config_has_product_defaults' | 'subscription_replaces_rbac' | 'workspace_settings_mixed_with_product' | 'user_role_mixed_with_tenant_plan' | 'module_boundary_leak';
export interface HierarchyViolationEntry {
    violation: HierarchyViolation;
    description: string;
    sourceFile?: string;
    severity: 'error' | 'warning';
}
export declare const HIERARCHY_RULES: Record<HierarchyViolation, string>;
export declare function describeHierarchy(): string;
