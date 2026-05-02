import type { NavCtx, NavSource, NavSourceResult } from './nav-source';
/**
 * L1 — Dynamic UI nav source.
 * GET /api/dynamic-ui/workspace/nav with 800ms timeout. Tolerant: any
 * non-2xx, network error, timeout, or malformed payload returns null
 * (skip layer). The dynamic-ui service is currently `.skipped`, so this
 * source's null-return is the default state until that backend lands.
 */
export declare class DynamicUiNavSource implements NavSource {
    readonly id = "dynamic-ui";
    private readonly http;
    resolve(_ctx: NavCtx): Promise<NavSourceResult>;
}
