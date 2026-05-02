"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MWR_BASELINE_FLOOR = exports.UI_ONLY_MODULE_REFS = exports.CANONICAL_MODULES = void 0;
exports.isCanonicalModuleCode = isCanonicalModuleCode;
exports.registerCanonicalModules = registerCanonicalModules;
exports.resolveMinMwrRowsRequired = resolveMinMwrRowsRequired;
exports.CANONICAL_MODULES = new Set();
function isCanonicalModuleCode(code) {
    return exports.CANONICAL_MODULES.has(code);
}
function registerCanonicalModules(codes) {
    for (const code of codes) {
        exports.CANONICAL_MODULES.add(code);
    }
}
exports.UI_ONLY_MODULE_REFS = new Set([
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
exports.MWR_BASELINE_FLOOR = 13;
function parseEnvMinRows() {
    const raw = process.env.PROVISIONING_MIN_MWR_ROWS;
    if (raw == null || raw === '')
        return null;
    const n = Number.parseInt(String(raw), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
}
/**
 * Minimum rows required in tenant module_workflow_registry for provisioning readiness.
 * Never require more MWR rows than exist in the product catalog for this tenant/product
 * (avoids false "not ready" when catalog has fewer than historical baseline).
 * Baseline floor applies only when the catalog is at least that large.
 */
function resolveMinMwrRowsRequired(productModulesRowCount) {
    const envFloor = parseEnvMinRows();
    const fromProduct = Math.max(0, productModulesRowCount);
    let min = fromProduct;
    if (fromProduct >= exports.MWR_BASELINE_FLOOR) {
        min = Math.max(min, exports.MWR_BASELINE_FLOOR);
    }
    if (envFloor != null) {
        min = Math.max(min, envFloor);
    }
    return min;
}
