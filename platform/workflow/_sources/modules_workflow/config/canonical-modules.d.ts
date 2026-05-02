export type CanonicalModuleCode = string;
export declare const CANONICAL_MODULES: Set<string>;
export declare function isCanonicalModuleCode(code: string): boolean;
export declare function registerCanonicalModules(codes: readonly string[] | Set<string> | string[]): void;
export declare const UI_ONLY_MODULE_REFS: ReadonlySet<string>;
/**
 * Single source for product-module counts used in provisioning readiness (MWR floor).
 * Baseline 13 matches historical seed; required minimum is never below product_modules rows or env override.
 */
export declare const MWR_BASELINE_FLOOR = 13;
/**
 * Minimum rows required in tenant module_workflow_registry for provisioning readiness.
 * Never require more MWR rows than exist in the product catalog for this tenant/product
 * (avoids false "not ready" when catalog has fewer than historical baseline).
 * Baseline floor applies only when the catalog is at least that large.
 */
export declare function resolveMinMwrRowsRequired(productModulesRowCount: number): number;
