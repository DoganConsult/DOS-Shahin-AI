import { Injectable } from '@angular/core';
import type { DosNavItem } from '@dos/ui-contracts';
import type { NavCtx, NavSource, NavSourceResult } from './nav-source';
// Codegen registry import retained as type-only — the source is regenerated
// on every @dos/access-store build via the prebuild hook so the data is
// always available for module-context sidebars (Phase F+).
import type {
  ModuleNavContract,
  ModuleNavItemContract,
} from '../generated/module-navigation.registry';

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
@Injectable({ providedIn: 'root' })
export class ModuleLibraryNavSource implements NavSource {
  readonly id = 'module-library';

  async resolve(_ctx: NavCtx): Promise<NavSourceResult> {
    // Workspace-sidebar context: return null. The global sidebar must
    // only show module ENTRIES (handled by L4 product-composition from
    // product.manifest.json's navigationComposition.primary/secondary).
    // Module-INTERNAL nav (e.g. Foundation's 14 sub-pages from
    // platform/foundation/contracts/navigation/navigation.json) belongs
    // inside the module's own page chrome — typically a left rail
    // rendered when the user is on /foundation/*. Emitting those 14
    // items into the workspace sidebar pollutes the shell with
    // overlapping `Foundation` (L4 entry) + 14 sub-pages (L3 contract).
    //
    // The codegen registry at
    //   platform/access/dos-access-store/src/generated/module-navigation.registry.ts
    // is still maintained on every build. When module-context sidebars
    // ship (Phase F admin/Dynamic UI), they will read from
    // `getModuleNavContract(moduleCode)` directly and render module
    // pages WITHOUT going through this NavSource. Until then, return
    // null and let L5 (access-store-nav.source) surface entitlement
    // gaps with `route-not-wired`.
    return null;
  }

  /**
   * Reserved for the module-context sidebar (Phase F+). Reads the codegen
   * registry directly when the host product is showing a single module's
   * page. Not currently invoked from this source — kept for re-use by
   * downstream module-context resolvers without re-implementing the
   * contract→nav-item adapter logic.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private toModuleItem(
    it: ModuleNavItemContract,
    moduleCode: string,
    contract: ModuleNavContract,
  ): DosNavItem {
    // Resolve enclosing group: a group whose `items[]` contains this item id.
    const enclosing = (contract.groups || []).find((g) =>
      Array.isArray(g.items) && g.items.includes(it.id));
    const group = it.group ?? enclosing?.id ?? moduleCode;
    return {
      id: String(it.id),
      label: String(it.label ?? it.id ?? moduleCode),
      labelKey: it.labelKey,
      route: it.route,
      icon: it.icon,
      badge: it.badge,
      requiredPermission: it.permission,
      moduleCode,
      enabled: true,
      group,
      ...({ __tier: 'module' } as Record<string, unknown>),
    } as DosNavItem;
  }
}
