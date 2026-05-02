/**
 * UPOR Service — Unified Platform Object Registry
 * Dr-Dogan-AGRC-OS / Shahin-AI GRC Platform
 *
 * All queries against master.* tables use masterQuery (sets search_path=public,
 * so we always use explicit schema prefix: master.<table>).
 * All queries against per-tenant tables use safeQuery + tenantSchema.
 *
 * RESOLVER GATE ORDER (non-negotiable — from locked Q1/Q3 decisions):
 *   Gate 1 — catalog status:      po.status IN ('active','beta')
 *   Gate 2 — runtime enabled:     cc.is_runtime_enabled = true
 *   Gate 3 — default enable mode: cc.default_enable_mode = 'on'
 *             OR (override exists AND override.is_enabled = true)
 *   Gate 4 — module activation:   parent module active in module_workflow_registry
 *             (ONLY when cc.module_activation_source = 'module_workflow_registry'
 *              OR the component belongs to a module layer)
 *   Gate 5 — tenant override:     co.uuid IS NULL OR co.is_enabled = true
 *   Gate 6 — compatibility check: (applied in TS after DB query)
 *   Gate 7 — permission/flags:    (applied by caller — context-dependent)
 *   Order  — COALESCE(co.sort_order, cc.sort_order)
 *
 * Hard blocks (CANNOT be bypassed by any tenant override):
 *   - status IN ('deprecated','retired','draft')
 *   - is_runtime_enabled = false
 *   - module disabled in module_workflow_registry
 */
import type { PlatformObject, ComponentCatalogRow, EffectiveComponent, DependencyResult, AuditWriteInput, CatalogSearchFilter, EnableComponentInput, DisableComponentInput, SetConfigOverrideInput, ReorderComponentInput, GetEffectiveInput } from './upor.types';
export declare function getEffectiveComponents(input: GetEffectiveInput): Promise<EffectiveComponent[]>;
/**
 * Get full catalog with optional filters.
 * Does NOT apply tenant gates — returns global catalog truth.
 */
export declare function getCatalog(filter?: CatalogSearchFilter): Promise<(PlatformObject & {
    csn: string | null;
    routePath: string | null;
})[]>;
/**
 * Get a single catalog entry by CSN.
 * Returns null if not found.
 * Hard 404 is enforced at the route layer.
 */
export declare function getCatalogByCsn(csn: string): Promise<(PlatformObject & {
    catalog: ComponentCatalogRow;
}) | null>;
/**
 * Dependency graph: upstream (what this depends on) + downstream (what depends on this).
 */
export declare function getDependencyGraph(objectId: string): Promise<DependencyResult | null>;
export declare function getRouteBindings(tenantId: string): Promise<Pick<EffectiveComponent, 'csn' | 'componentKey' | 'routePath' | 'loaderStrategy' | 'allowlistGroup' | 'i18nKey'>[]>;
export declare function getWidgetBindings(tenantId: string): Promise<Pick<EffectiveComponent, 'csn' | 'componentKey' | 'capabilities' | 'uiMetadata' | 'configOverride'>[]>;
export declare function getNavBindings(tenantId: string): Promise<Pick<EffectiveComponent, 'csn' | 'componentKey' | 'sortOrder' | 'i18nKey' | 'labelOverride'>[]>;
export declare function writeAuditLog(input: AuditWriteInput): Promise<void>;
export declare function getAuditLog(tenantId: string, csn?: string, from?: string, to?: string, limit?: number): Promise<Record<string, unknown>[]>;
/**
 * Enable a component for a tenant.
 * Creates override row if absent, sets is_enabled=true.
 * Audit log written on every call.
 * HARD BLOCK: cannot enable a retired/deprecated/draft component.
 */
export declare function enableComponent(input: EnableComponentInput): Promise<void>;
/**
 * Disable a component for a tenant.
 * Creates override row if absent, sets is_enabled=false.
 * NOTE: A retired/deprecated component cannot be re-enabled; disable is still valid
 * (they're already blocked by Gate 1 — but disabling an active one is the main use case).
 */
export declare function disableComponent(input: DisableComponentInput): Promise<void>;
/**
 * Set per-tenant config override (merges into existing config).
 */
export declare function setConfigOverride(input: SetConfigOverrideInput): Promise<void>;
/**
 * Set sort order override for a component.
 */
export declare function reorderComponent(input: ReorderComponentInput): Promise<void>;
