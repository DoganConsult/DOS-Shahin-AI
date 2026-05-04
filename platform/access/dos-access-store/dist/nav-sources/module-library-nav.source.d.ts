import type { NavCtx, NavSource, NavSourceResult } from './nav-source';
/**
 * L3 — Module library nav source.
 *
 * Reads the host product's manifest (`product.manifest.json`) to learn which
 * `modules/<x>/` the product subscribes to via `enabledModules[]`, then
 * resolves each module's nav contract from
 * `platform/access/dos-access-store/src/generated/module-navigation.registry.ts`
 * (codegen scans `**\/contracts/navigation/navigation.json` files at build
 * time — `pnpm modulenav:codegen:write`). Emits DosNavItems tagged tier='module'.
 *
 * For workspace-sidebar context, this source returns Foundation module items
 * when the user has Foundation entitlement. Other modules' internal nav items
 * are not surfaced in the workspace sidebar (they belong in module-context sidebars).
 *
 * Items are tenant-entitled — final visibility decided downstream by the
 * filter pipeline against `access.modules()`. This source emits unfiltered.
 *
 * Path-clean: all modules are kebab-case post-consolidation (no spaces,
 * no "Module" suffix), so `modules/<moduleCode>/contracts/navigation/...`
 * is canonical, and the codegen registers them under that exact moduleCode.
 *
 * If a module has NO navigation.json (most modules today), the registry
 * returns undefined for that code and L5 surfaces the entitlement gap with
 * `route-not-wired` rather than the source emitting empty items.
 */
export declare class ModuleLibraryNavSource implements NavSource {
    readonly id = "module-library";
    resolve(ctx: NavCtx): Promise<NavSourceResult>;
    /**
     * Converts a module navigation contract item to a DosNavItem.
     * Reserved for module-context sidebar (Phase F+). Reads the codegen
     * registry directly when the host product is showing a single module's
     * page.
     */
    private toModuleItem;
}
