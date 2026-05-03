import { InjectionToken } from '@angular/core';
/**
 * L4 product-composition source is product-owned (it reads the bundled
 * product.manifest.json). The platform orchestrator (WorkspaceNavigationAdapter)
 * accepts it via DI rather than direct import so platform never reaches into
 * product code. Products provide it in app.config.ts:
 *
 *   { provide: WORKSPACE_NAV_PRODUCT_SOURCE, useExisting: ProductCompositionNavSource }
 */
export const WORKSPACE_NAV_PRODUCT_SOURCE = new InjectionToken('WORKSPACE_NAV_PRODUCT_SOURCE');
export const WORKSPACE_NAV_LABEL_RESOLVER = new InjectionToken('WORKSPACE_NAV_LABEL_RESOLVER');
//# sourceMappingURL=nav-source.js.map