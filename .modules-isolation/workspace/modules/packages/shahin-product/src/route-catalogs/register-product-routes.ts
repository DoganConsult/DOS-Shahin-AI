// @ts-nocheck — module-layer imports not yet extracted
/**
 * Shahin-AI Product Route Registration
 *
 * OWNERSHIP: Product (Shahin-AI / AGRC)
 *
 * Registers all AGRC product route catalogs into the platform route catalog registry.
 * Called once at product startup, before route mounting.
 *
 * This replaces the old pattern where platform/route-catalogs/domain/*.ts files
 * statically re-exported from this product — violating platform-product separation.
 */

import { registerRouteCatalog } from '../../../platform/routing/route-catalog-registry';

import { GOVERNANCE_ROUTES } from './governance-routes.catalog';
import { RISK_ROUTES } from './risk-routes.catalog';
import { COMPLIANCE_ROUTES } from './compliance-routes.catalog';
import { AUDIT_ROUTES } from './audit-routes.catalog';
import { EVIDENCE_ROUTES } from './evidence-routes.catalog';
import { AI_ROUTES } from './ai-routes.catalog';
import { VENDOR_ROUTES } from './vendor-routes.catalog';
import { POLICY_ROUTES } from './policy-routes.catalog';
import { DOMAIN_ROUTES } from './domain-routes.catalog';

const ALL_AGRC_ROUTES = [
  ...GOVERNANCE_ROUTES,
  ...RISK_ROUTES,
  ...COMPLIANCE_ROUTES,
  ...AUDIT_ROUTES,
  ...EVIDENCE_ROUTES,
  ...AI_ROUTES,
  ...VENDOR_ROUTES,
  ...POLICY_ROUTES,
  ...DOMAIN_ROUTES,
];

export function registerAgrcProductRoutes(): void {
  registerRouteCatalog('agrc', ALL_AGRC_ROUTES);
}
