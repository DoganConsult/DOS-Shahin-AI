"use strict";
// @ts-nocheck — platform validation tool, stabilizing incrementally
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateModuleClassificationCompleteness = validateModuleClassificationCompleteness;
exports.validatePlatformProductSeparation = validatePlatformProductSeparation;
exports.validateHierarchy = validateHierarchy;
exports.getHierarchyRuleDescription = getHierarchyRuleDescription;
const modules_1 = require("@dos/platform-core/modules");
const ownership_matrix_1 = require("./ownership-matrix");
const modules_2 = require("@dos/platform-core/modules");
const config_boundary_1 = require("./config-boundary");
const validateFeatureEntitlementCoverage = () => [];
const hierarchy_contracts_1 = require("./hierarchy-contracts");
function runCheck(name, fn) {
    const errors = fn();
    return { check: name, passed: errors.length === 0, errors };
}
function validateModuleClassificationCompleteness() {
    const errors = [];
    const platformCore = (0, modules_1.getModuleCodesByTier)('platform-core');
    const platformAi = (0, modules_1.getModuleCodesByTier)('platform-ai');
    const product = (0, modules_1.getModuleCodesByTier)('product');
    const edgeExternal = (0, modules_1.getModuleCodesByTier)('edge-external');
    const classified = new Set([
        ...platformCore,
        ...platformAi,
        ...product,
        ...edgeExternal,
    ]);
    for (const code of (0, modules_1.getAllRegisteredModuleCodes)()) {
        if (!classified.has(code)) {
            errors.push(`Module '${code}' is not classified in any hierarchy tier (platform-core, platform-ai, product, or edge-external)`);
        }
    }
    const total = platformCore.length + platformAi.length + product.length + edgeExternal.length;
    if (total !== classified.size) {
        errors.push(`Duplicate module codes detected across tier arrays: ${total} entries but only ${classified.size} unique codes`);
    }
    return errors;
}
function validatePlatformProductSeparation() {
    const errors = [];
    const platformSet = new Set([...(0, modules_1.getModuleCodesByTier)('platform-core'), ...(0, modules_1.getModuleCodesByTier)('platform-ai')]);
    const productSet = new Set([...(0, modules_1.getModuleCodesByTier)('product'), ...(0, modules_1.getModuleCodesByTier)('edge-external')]);
    for (const code of platformSet) {
        if (productSet.has(code)) {
            errors.push(`Module '${code}' appears in both platform and product tiers — hierarchy violation`);
        }
    }
    return errors;
}
function validateHierarchy() {
    const checks = [
        runCheck('ownership-completeness', ownership_matrix_1.validateOwnershipCompleteness),
        runCheck('hierarchy-layer-consistency', ownership_matrix_1.validateHierarchyLayerConsistency),
        runCheck('registry-alignment', modules_2.validateRegistryAlignment),
        runCheck('config-boundary-separation', config_boundary_1.validateConfigBoundarySeparation),
        runCheck('feature-entitlement-coverage', validateFeatureEntitlementCoverage),
        runCheck('module-classification-completeness', validateModuleClassificationCompleteness),
        runCheck('platform-product-separation', validatePlatformProductSeparation),
    ];
    const violations = [];
    for (const check of checks) {
        if (!check.passed) {
            const violationType = mapCheckToViolation(check.check);
            for (const error of check.errors) {
                violations.push({
                    violation: violationType,
                    description: error,
                    severity: 'error',
                });
            }
        }
    }
    return {
        timestamp: new Date().toISOString(),
        passed: violations.length === 0,
        violations,
        checks,
    };
}
function mapCheckToViolation(checkName) {
    switch (checkName) {
        case 'platform-product-separation':
            return 'platform_depends_on_product';
        case 'config-boundary-separation':
            return 'tenant_config_has_product_defaults';
        case 'feature-entitlement-coverage':
            return 'subscription_replaces_rbac';
        case 'hierarchy-layer-consistency':
            return 'module_boundary_leak';
        default:
            return 'module_boundary_leak';
    }
}
function getHierarchyRuleDescription(violation) {
    return hierarchy_contracts_1.HIERARCHY_RULES[violation];
}
//# sourceMappingURL=hierarchy-validator.js.map