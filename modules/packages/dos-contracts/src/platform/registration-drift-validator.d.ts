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
interface ValidationResult {
    check: string;
    passed: boolean;
    details?: string[];
}
export declare function validateRegistrationDrift(cruds: any[], canonicalModules: ReadonlySet<string>, uiOnlyModules: ReadonlySet<string>): ValidationResult[];
export {};
