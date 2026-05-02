import type { NavCtx, NavSource, NavSourceResult } from './nav-source';
/**
 * L5 — AccessStore nav source.
 *
 * Surfaces tenant-entitled modules from `access.modules()` that NO higher
 * layer (L1/L2/L3/L4) covered. These items get `disabledReason='route-not-wired'`
 * so the user can SEE that the entitlement exists while the catalog gap is
 * surfaced visibly rather than silently swallowed.
 *
 * Tier='module' for filter-pipeline tier-awareness. Higher layers' items
 * already provide enabled/disabledReason; this layer only fills missing entries.
 */
export declare class AccessStoreNavSource implements NavSource {
    readonly id = "access-store";
    private readonly access;
    resolve(ctx: NavCtx): Promise<NavSourceResult>;
}
