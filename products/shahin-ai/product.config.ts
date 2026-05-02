/**
 * Shahin-AI Product Configuration (typed)
 *
 * Source-of-truth values come from product.manifest.json and the platform
 * runtime-config. This file expresses the manifest as a typed binding for the
 * product shell and the @dos/platform-core composition layer.
 *
 * Boundary rules:
 *   - This file MUST live under products/shahin-ai/.
 *   - This file MUST NOT import any module internals.
 *   - This file MUST NOT import platform internals; it consumes platform
 *     contracts via @dos/contracts and @dos/types only.
 *   - Auth mode is fixed to cookie-session (httpOnly). Do NOT introduce any
 *     localStorage token storage here or anywhere in the product.
 */

import type {
  ProductManifest,
  ProductRuntimeConfig
} from '@dos/contracts';

import manifest from './product.manifest.json' assert { type: 'json' };

const productManifest: ProductManifest = manifest as ProductManifest;

export const productConfig: ProductRuntimeConfig = {
  productCode: productManifest.productCode,
  displayName: productManifest.displayName,
  hosts: productManifest.hosts,
  authMode: productManifest.authMode,
  routeMountPoint: productManifest.routeComposition.mountPoint,
  publicCompatPrefixes: productManifest.routeComposition.publicCompatPrefixes,
  enabledModules: productManifest.enabledModules.map((m) => m.moduleCode),
  navigation: productManifest.navigationComposition,
  theme: productManifest.theme,
  i18n: productManifest.i18n
};

export { productManifest };
export default productConfig;
