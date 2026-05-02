// Platform boundary - modules will be dynamically registered by the active product payload
export type CanonicalModuleCode = string;

export const CANONICAL_MODULES = new Set<CanonicalModuleCode>();

export function isCanonicalModuleCode(code: string): boolean {
  return CANONICAL_MODULES.has(code);
}

export function registerCanonicalModules(codes: readonly string[] | Set<string> | string[]): void {
  for (const code of codes) {
    CANONICAL_MODULES.add(code);
  }
}

export const UI_ONLY_MODULE_REFS: ReadonlySet<string> = new Set([
  'maturity',
  'knowledge',
  'workspace',
  'dashboard',
  'home',
  'settings',
  'profile',
]);

/**
 * Single source for product-module counts used in provisioning readiness (MWR floor).
 * Baseline 13 matches historical seed; required minimum is never below product_modules rows or env override.
 */
export const MWR_BASELINE_FLOOR = 13;

function parseEnvMinRows(): number | null {
  const raw = process.env.PROVISIONING_MIN_MWR_ROWS;
  if (raw == null || raw === '') return null;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Minimum rows required in tenant module_workflow_registry for provisioning readiness.
 * Never require more MWR rows than exist in the product catalog for this tenant/product
 * (avoids false "not ready" when catalog has fewer than historical baseline).
 * Baseline floor applies only when the catalog is at least that large.
 */
export function resolveMinMwrRowsRequired(productModulesRowCount: number): number {
  const envFloor = parseEnvMinRows();
  const fromProduct = Math.max(0, productModulesRowCount);
  let min = fromProduct;
  if (fromProduct >= MWR_BASELINE_FLOOR) {
    min = Math.max(min, MWR_BASELINE_FLOOR);
  }
  if (envFloor != null) {
    min = Math.max(min, envFloor);
  }
  return min;
}
