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

export type HierarchyLayer =
  | 'platform'
  | 'product'
  | 'module'
  | 'tenant'
  | 'user';

export type HierarchySideLayer = 'subscription';

export const HIERARCHY_ORDER: readonly HierarchyLayer[] = [
  'platform',
  'product',
  'module',
  'tenant',
  'user',
] as const;

export const HIERARCHY_SIDE_LAYERS: readonly HierarchySideLayer[] = [
  'subscription',
] as const;

export interface HierarchyObjectContract {
  layer: HierarchyLayer | HierarchySideLayer;
  owner: string;
  scope: string;
  data: string;
  permissions: string;
  examples: string[];
}

export const HIERARCHY_GOVERNANCE_MODEL: Record<
  HierarchyLayer | HierarchySideLayer,
  HierarchyObjectContract
> = {
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

export type PlatformModuleCode =
  | 'foundation'
  | 'admin'
  | 'workflow'
  | 'notification'
  | 'team'
  | 'inbox';

export type PlatformAiModuleCode =
  | 'ai'
  | 'ai-governance';

export type ProductModuleCode =
  | 'governance'
  | 'risk'
  | 'compliance'
  | 'policy'
  | 'evidence'
  | 'audit'
  | 'incident'
  | 'exception'
  | 'vendor'
  | 'bcp'
  | 'asset'
  | 'remediation'
  | 'action'
  | 'training'
  | 'qiyas'
  | 'reporting'
  | 'analytics'
  | 'issues'
  | 'records'
  | 'privacy';

export type EdgeModuleCode =
  | 'integrations'
  | 'portals';

export type AllModuleCode =
  | PlatformModuleCode
  | PlatformAiModuleCode
  | ProductModuleCode
  | EdgeModuleCode;

export const PLATFORM_MODULE_CODES: readonly PlatformModuleCode[] = [
  'foundation', 'admin', 'workflow', 'notification', 'team', 'inbox',
] as const;

export const PLATFORM_AI_MODULE_CODES: readonly PlatformAiModuleCode[] = [
  'ai', 'ai-governance',
] as const;

export const PRODUCT_MODULE_CODES: readonly ProductModuleCode[] = [
  'governance', 'risk', 'compliance', 'policy', 'evidence', 'audit',
  'incident', 'exception', 'vendor', 'bcp', 'asset', 'remediation',
  'action', 'training', 'qiyas', 'reporting', 'analytics',
  'issues', 'records', 'privacy',
] as const;

export const EDGE_MODULE_CODES: readonly EdgeModuleCode[] = [
  'integrations', 'portals',
] as const;

const _PLATFORM_SET: ReadonlySet<string> = new Set([...PLATFORM_MODULE_CODES, ...PLATFORM_AI_MODULE_CODES]);
const _PRODUCT_SET: ReadonlySet<string> = new Set(PRODUCT_MODULE_CODES);
const _EDGE_SET: ReadonlySet<string> = new Set(EDGE_MODULE_CODES);

export function isPlatformModule(code: string): code is PlatformModuleCode | PlatformAiModuleCode {
  return _PLATFORM_SET.has(code);
}

export function isProductModule(code: string): code is ProductModuleCode {
  return _PRODUCT_SET.has(code);
}

export function isEdgeModule(code: string): code is EdgeModuleCode {
  return _EDGE_SET.has(code);
}

export function getModuleHierarchyLayer(code: string): HierarchyLayer {
  if (_PLATFORM_SET.has(code)) return 'platform';
  if (_PRODUCT_SET.has(code)) return 'product';
  if (_EDGE_SET.has(code)) return 'product';
  return 'module';
}

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

export type HierarchyViolation =
  | 'platform_depends_on_product'
  | 'tenant_config_has_product_defaults'
  | 'subscription_replaces_rbac'
  | 'workspace_settings_mixed_with_product'
  | 'user_role_mixed_with_tenant_plan'
  | 'module_boundary_leak';

export interface HierarchyViolationEntry {
  violation: HierarchyViolation;
  description: string;
  sourceFile?: string;
  severity: 'error' | 'warning';
}

export const HIERARCHY_RULES: Record<HierarchyViolation, string> = {
  platform_depends_on_product:
    'Platform code must not import or depend on product code except at composition root for activation wiring.',
  tenant_config_has_product_defaults:
    'Tenant config must hold tenant-specific overrides only, not product defaults.',
  subscription_replaces_rbac:
    'Subscription gates entitlement (what is licensed), RBAC gates access (who can do what). Never merge them.',
  workspace_settings_mixed_with_product:
    'Workspace/platform settings must stay separate from product (Shahin) settings.',
  user_role_mixed_with_tenant_plan:
    'User role/identity must not be conflated with tenant plan or module ownership.',
  module_boundary_leak:
    'Module boundaries must stay truthful. No permission leakage or fake ownership borrowing across modules.',
};

export function describeHierarchy(): string {
  return HIERARCHY_ORDER
    .map((layer, i) => `${i + 1}. ${layer.charAt(0).toUpperCase() + layer.slice(1)}`)
    .join(' → ')
    + ` | Side-layer: ${HIERARCHY_SIDE_LAYERS.join(', ')}`;
}
