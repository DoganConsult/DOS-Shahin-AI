import type { NavCtx, NavSource, NavSourceResult } from './nav-source';
/**
 * L1 — Dynamic UI nav source.
 * GET /api/ui-os/workspace/nav with 800ms timeout. Tolerant: any
 * non-2xx, network error, timeout, or malformed payload returns null
 * (skip layer). The ui-os-service serves DB-driven nav from
 * dos.dynamic_ui_routes + dos.navigation_registry.
 */
export declare class DynamicUiNavSource implements NavSource {
    readonly id = "dynamic-ui";
    private readonly http;
    resolve(_ctx: NavCtx): Promise<NavSourceResult>;
}
