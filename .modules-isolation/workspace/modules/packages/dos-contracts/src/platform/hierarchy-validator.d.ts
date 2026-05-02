/**
 * Hierarchy Validator — runtime validation of hierarchy separation rules.
 *
 * Detects violations of the canonical hierarchy:
 *   Platform → Product → Module → Tenant → User
 *   (Subscription as side-layer)
 *
 * Rules validated:
 *   1. Platform code must not depend on product code
 *   2. Tenant config must not contain product defaults
 *   3. Subscription must not replace RBAC
 *   4. Workspace settings must not mix with product settings
 *   5. Module boundaries must stay truthful
 */
import { type HierarchyViolation, type HierarchyViolationEntry } from './hierarchy-contracts';
export interface HierarchyValidationReport {
    timestamp: string;
    passed: boolean;
    violations: HierarchyViolationEntry[];
    checks: HierarchyCheckResult[];
}
export interface HierarchyCheckResult {
    check: string;
    passed: boolean;
    errors: string[];
}
export declare function validateModuleClassificationCompleteness(): string[];
export declare function validatePlatformProductSeparation(): string[];
export declare function validateHierarchy(): HierarchyValidationReport;
export declare function getHierarchyRuleDescription(violation: HierarchyViolation): string;
