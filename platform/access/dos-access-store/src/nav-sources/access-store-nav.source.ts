import { Injectable, inject } from '@angular/core';
import type { DosNavItem } from '@dos/ui-contracts';
import { AccessStore } from '../access.store';
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
@Injectable({ providedIn: 'root' })
export class AccessStoreNavSource implements NavSource {
  readonly id = 'access-store';
  private readonly access = inject(AccessStore);

  async resolve(ctx: NavCtx): Promise<NavSourceResult> {
    const entitled = this.access.modules();
    if (!entitled || entitled.length === 0) return null;

    // De-duplicate against L4 (product composition manifest).
    const manifest = ctx.productManifest as {
      navigationComposition?: {
        primary?: Array<{ id?: string; moduleRef?: string }>;
        secondary?: Array<{ id?: string; moduleRef?: string }>;
      };
    } | undefined;
    const manifestModuleRefs = new Set<string>();
    for (const block of [manifest?.navigationComposition?.primary, manifest?.navigationComposition?.secondary]) {
      for (const item of block ?? []) {
        if (item?.moduleRef) manifestModuleRefs.add(item.moduleRef);
        if (item?.id)        manifestModuleRefs.add(item.id);
      }
    }

    // De-duplicate against L1 (DB-driven dynamic-ui nav source).
    // L1 item IDs are compound ("config-center./admin/config-center/resolve") but
    // their `group` field carries the moduleCode ("config-center"). If any L1 item
    // already covers a module, L5 must not emit a shadow gap item for it.
    const l1ModuleCodes = new Set<string>();
    for (const item of ctx.l1Items ?? []) {
      if (item.group)      l1ModuleCodes.add(item.group);
      if (item.moduleCode) l1ModuleCodes.add(item.moduleCode);
    }

    const uncovered = entitled.filter((moduleCode) =>
      !!moduleCode &&
      !manifestModuleRefs.has(moduleCode) &&
      !l1ModuleCodes.has(moduleCode));

    if (uncovered.length === 0) return [];

    return uncovered.map<DosNavItem>((moduleCode) => ({
      id: moduleCode,
      label: moduleCode,
      moduleCode,
      enabled: false,
      disabledReason: 'route-not-wired',
      group: 'modules',
      ...({ __tier: 'module' } as Record<string, unknown>),
    } as DosNavItem));
  }
}
