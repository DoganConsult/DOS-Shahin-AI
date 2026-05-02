import type { DosNavItem } from '@dos/ui-contracts';
import type { NavCtx, NavSource, NavSourceResult } from './nav-source';
/**
 * L6 — Survival fallback.
 *
 * Returns the 5 core workspace routes ONLY when:
 *   (a) every higher source (L1..L5) returned null, AND
 *   (b) `!access.loaded()` — i.e. no real session yet.
 *
 * Once any real source contributes anything, this source is suppressed.
 *
 * Constant name MUST be `CORE_WORKSPACE_NAV` — the lint guard
 * `lint-no-static-nav-fallback.mjs` rejects `STATIC_*_NAV_CHILDREN`.
 */
export declare const CORE_WORKSPACE_NAV: ReadonlyArray<DosNavItem>;
export declare class SurvivalFallbackNavSource implements NavSource {
    readonly id = "survival-fallback";
    private readonly access;
    resolve(_ctx: NavCtx): Promise<NavSourceResult>;
}
