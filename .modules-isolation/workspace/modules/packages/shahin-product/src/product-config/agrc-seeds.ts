/**
 * Shahin-AI product seeds — references canonical product definition.
 * Used by provisioning to install product defaults into a new tenant.
 *
 * Law 15: Product removable principle — seeds are product-owned, not platform-owned.
 */
import { AGRC_PRODUCT_DEFINITION } from '../agrc-product.definition';

export const AGRC_SEEDS = {
  productCode: AGRC_PRODUCT_DEFINITION.pack_key,
  version: AGRC_PRODUCT_DEFINITION.version,
  modules: AGRC_PRODUCT_DEFINITION.modules,
  featureFlags: AGRC_PRODUCT_DEFINITION.feature_flags,
  rolePack: AGRC_PRODUCT_DEFINITION.role_pack,
  dashboardPack: AGRC_PRODUCT_DEFINITION.dashboard_pack,
  widgetDefinitions: AGRC_PRODUCT_DEFINITION.widget_definitions,
  dashboardDefinitions: AGRC_PRODUCT_DEFINITION.dashboard_definitions,
  workflowPack: AGRC_PRODUCT_DEFINITION.workflow_pack,
  contentPackInstallations: AGRC_PRODUCT_DEFINITION.content_pack_installations ?? [],
};
