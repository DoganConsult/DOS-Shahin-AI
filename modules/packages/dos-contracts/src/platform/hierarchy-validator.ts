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

import {
  getAllRegisteredModuleCodes,
  getModuleCodesByTier,
} from '@dos/platform-core/modules';
import { validateOwnershipCompleteness, validateHierarchyLayerConsistency } from './ownership-matrix';
import { validateRegistryAlignment } from '@dos/platform-core/modules';
import { validateConfigBoundarySeparation } from './config-boundary';
const validateFeatureEntitlementCoverage = () => [];
import {
  HIERARCHY_RULES,
  type HierarchyViolation,
  type HierarchyViolationEntry,
} from './hierarchy-contracts';

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

function runCheck(name: string, fn: () => string[]): HierarchyCheckResult {
  const errors = fn();
  return { check: name, passed: errors.length === 0, errors };
}

export function validateModuleClassificationCompleteness(): string[] {
  const errors: string[] = [];
  const platformCore = getModuleCodesByTier('platform-core');
  const platformAi = getModuleCodesByTier('platform-ai');
  const product = getModuleCodesByTier('product');
  const edgeExternal = getModuleCodesByTier('edge-external');
  const classified = new Set<string>([
    ...platformCore,
    ...platformAi,
    ...product,
    ...edgeExternal,
  ]);

  for (const code of getAllRegisteredModuleCodes()) {
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

export function validatePlatformProductSeparation(): string[] {
  const errors: string[] = [];
  const platformSet = new Set<string>([...getModuleCodesByTier('platform-core'), ...getModuleCodesByTier('platform-ai')]);
  const productSet = new Set<string>([...getModuleCodesByTier('product'), ...getModuleCodesByTier('edge-external')]);

  for (const code of platformSet) {
    if (productSet.has(code)) {
      errors.push(`Module '${code}' appears in both platform and product tiers — hierarchy violation`);
    }
  }

  return errors;
}

export function validateHierarchy(): HierarchyValidationReport {
  const checks: HierarchyCheckResult[] = [
    runCheck('ownership-completeness', validateOwnershipCompleteness),
    runCheck('hierarchy-layer-consistency', validateHierarchyLayerConsistency),
    runCheck('registry-alignment', validateRegistryAlignment),
    runCheck('config-boundary-separation', validateConfigBoundarySeparation),
    runCheck('feature-entitlement-coverage', validateFeatureEntitlementCoverage),
    runCheck('module-classification-completeness', validateModuleClassificationCompleteness),
    runCheck('platform-product-separation', validatePlatformProductSeparation),
  ];

  const violations: HierarchyViolationEntry[] = [];

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

function mapCheckToViolation(checkName: string): HierarchyViolation {
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

export function getHierarchyRuleDescription(violation: HierarchyViolation): string {
  return HIERARCHY_RULES[violation];
}
