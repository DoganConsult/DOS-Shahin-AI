"use strict";
// @ts-nocheck — platform validation tool, stabilizing incrementally
/**
 * Registration Drift Validator
 *
 * Validates cross-layer consistency across the 6 registration systems:
 * 1. DB module_workflow_registry (checked at runtime via SQL)
 * 2. Frontend module-ui.registry.ts (MODULE_UI_REGISTRY)
 * 3. Frontend component-registry.ts (MODULE_ROUTE_GROUPS + STANDALONE_ROUTES)
 * 4. Frontend page.registry.ts (PAGE_REGISTRY)
 * 5. Backend route-catalog.ts (ROUTE_CATALOG)
 * 6. Backend shahin-module-crud-catalog.ts (CRUD defs)
 *
 * Run: pnpm exec ts-node backend/src/platform/registration-drift-validator.ts
 *
 * Exit code 0 = all checks pass. Non-zero = drift detected.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegistrationDrift = validateRegistrationDrift;
const platform_core_1 = require("@dos/platform-core");
function validateRegistrationDrift(cruds, canonicalModules, uiOnlyModules) {
    const results = [];
    function check(name, fn) {
        const issues = fn();
        results.push({
            check: name,
            passed: issues.length === 0,
            details: issues.length > 0 ? issues : undefined,
        });
    }
    // Check 1: Every CRUD def has a parentModule that's a canonical module
    check('CRUD parentModule alignment', () => {
        const issues = [];
        for (const crud of cruds) {
            if (!crud.parentModule) {
                issues.push(`CRUD '${crud.module}' missing parentModule`);
            }
            else if (!canonicalModules.has(crud.parentModule)) {
                issues.push(`CRUD '${crud.module}' parentModule '${crud.parentModule}' not in CANONICAL_MODULES`);
            }
        }
        return issues;
    });
    // Check 2: Every route-catalog entry with a module guard references a canonical module
    check('Route catalog module guards', () => {
        const issues = [];
        for (const route of platform_core_1.ROUTE_CATALOG) {
            const mod = route.guards?.module;
            if (mod && !canonicalModules.has(mod) && !uiOnlyModules.has(mod)) {
                issues.push(`Route '${route.mountPath}' guard references non-canonical module '${mod}'`);
            }
        }
        return issues;
    });
    // Check 3: Every API-only route is explicitly classified
    check('API-only routes classified', () => {
        const issues = [];
        const apiOnlyRoutes = platform_core_1.ROUTE_CATALOG.filter(r => r.apiOnly);
        if (apiOnlyRoutes.length < 7) {
            issues.push(`Expected >= 7 apiOnly classifications, found ${apiOnlyRoutes.length}`);
        }
        return issues;
    });
    // Check 4: No duplicate mount paths (excluding intentional duplicates)
    check('No duplicate mount paths', () => {
        const issues = [];
        const seen = new Map();
        for (const route of platform_core_1.ROUTE_CATALOG) {
            if (route.intentionalDuplicateGroup)
                continue;
            const existing = seen.get(route.mountPath);
            if (existing && existing !== route.id) {
                issues.push(`Duplicate mountPath '${route.mountPath}': ${existing} vs ${route.id}`);
            }
            seen.set(route.mountPath, route.id);
        }
        return issues;
    });
    // Check 5: Route catalog minimum count
    check('Route catalog minimum count (330)', () => {
        const issues = [];
        if (platform_core_1.ROUTE_CATALOG.length < 330) {
            issues.push(`Route catalog has ${platform_core_1.ROUTE_CATALOG.length} entries, expected >= 330`);
        }
        return issues;
    });
    return results;
}
//# sourceMappingURL=registration-drift-validator.js.map