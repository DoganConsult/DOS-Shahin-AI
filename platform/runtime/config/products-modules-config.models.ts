/**
 * Phase 4: Tenant-scoped products/modules config (taxonomy-correct).
 * Matches backend ProductsModulesConfigResponse from GET /api/config/products-modules.
 * AGRC-OS = platform, Shahin-AI = product, Qiyas = module (not product).
 */
export interface ProductsModulesConfig {
  platform: { key: string; labelEn: string; labelAr: string };
  products: Array<{ internalKey: string; businessLabel: string }>;
  modulesByProduct: Record<string, string[]>;
  visibleModules: string[];
  sharedServices: string[];
  internalKeyToBusinessLabel: Record<string, string>;
}
