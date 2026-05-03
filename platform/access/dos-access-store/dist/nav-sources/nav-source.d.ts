import { InjectionToken } from '@angular/core';
import type { DosNavItem } from '@dos/ui-contracts';
import type { AccessStore } from '../access.store';
/**
 * NavSource — pluggable nav contributor.
 *
 * Result conventions:
 *   - `null` → "not available, skip; let lower-priority layers contribute".
 *   - `[]`   → "available but authoritatively empty (a real source spoke up)".
 *   - `DosNavItem[]` → contribution; items carry tier + metadata.
 *
 * The orchestrator runs L1..L5 concurrently and merges their contributions
 * into a single keyed map. Higher-priority layers own enabled/disabledReason;
 * lower-priority layers fill missing icon/route/permission/etc. L6 (survival
 * fallback) is used only when every L1..L5 returned null AND access store is
 * unloaded.
 */
export interface NavCtx {
    access: AccessStore;
    /** Optional product manifest already loaded by the host. */
    productManifest?: unknown;
    /**
     * L1 items resolved by DynamicUiNavSource, injected by the adapter after
     * L1 completes. Allows L5 (AccessStoreNavSource) to skip modules that L1
     * already covers, preventing duplicate ghost sidebar entries.
     */
    l1Items?: ReadonlyArray<DosNavItem>;
}
export type NavSourceResult = DosNavItem[] | null;
export interface NavSource {
    readonly id: string;
    resolve(ctx: NavCtx): Promise<NavSourceResult>;
}
/**
 * Product-provided label resolver consumed by the platform shell.
 * This lets the shell render Dynamic-UI/module keys with the product's
 * active locale without hardcoding product i18n inside platform code.
 */
export interface WorkspaceNavLabelResolver {
    navGroupLabel(idOrLabel: string | undefined | null): string;
    navItemLabel(idOrLabel: string | undefined | null, fallbackId?: string): string;
    /**
     * Localized shell chrome (Carbon header/account/sidenav). Return `null` for
     * unknown keys so the platform shell applies its documented English defaults.
     */
    shellChromeString?(key: string): string | null;
}
/**
 * L4 product-composition source is product-owned (it reads the bundled
 * product.manifest.json). The platform orchestrator (WorkspaceNavigationAdapter)
 * accepts it via DI rather than direct import so platform never reaches into
 * product code. Products provide it in app.config.ts:
 *
 *   { provide: WORKSPACE_NAV_PRODUCT_SOURCE, useExisting: ProductCompositionNavSource }
 */
export declare const WORKSPACE_NAV_PRODUCT_SOURCE: InjectionToken<NavSource>;
export declare const WORKSPACE_NAV_LABEL_RESOLVER: InjectionToken<WorkspaceNavLabelResolver>;
