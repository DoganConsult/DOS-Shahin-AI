import { AGRC_PRODUCT_DEFINITION } from './agrc-product.definition';
import type { PackManifest } from '@dos/contracts';

export const AGRC_PRODUCT_MANIFEST: PackManifest = {
  pack_key: AGRC_PRODUCT_DEFINITION.pack_key,
  pack_name: AGRC_PRODUCT_DEFINITION.pack_name,
  version: AGRC_PRODUCT_DEFINITION.version,
  pack_type: AGRC_PRODUCT_DEFINITION.pack_type,
  description: AGRC_PRODUCT_DEFINITION.description,
  modules: AGRC_PRODUCT_DEFINITION.modules,
  feature_flags: AGRC_PRODUCT_DEFINITION.feature_flags,
  role_pack: AGRC_PRODUCT_DEFINITION.role_pack,
  dashboard_pack: AGRC_PRODUCT_DEFINITION.dashboard_pack,
  widget_definitions: AGRC_PRODUCT_DEFINITION.widget_definitions,
  dashboard_definitions: AGRC_PRODUCT_DEFINITION.dashboard_definitions,
  workflow_pack: AGRC_PRODUCT_DEFINITION.workflow_pack,
  content_pack_installations: AGRC_PRODUCT_DEFINITION.content_pack_installations,
};
