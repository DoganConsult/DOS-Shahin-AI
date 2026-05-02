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

    // De-duplicate against L4 (product composition). When the product
    // manifest's navigationComposition already exposes a module as a
    // top-level entry (e.g. "foundation" → /foundation/overview), L5
    // must not re-emit it under a different id (`module.foundation`)
    // because the nav adapter merge is keyed by `id` — different ids
    // produce duplicate sidebar items.
    //
    // We collect every id used by L4 (manifest) and SKIP modules whose
    // moduleCode/id is already exposed there. L5's job is to surface
    // ENTITLED-but-NOT-IN-MANIFEST modules (so the user can see they
    // have access even if the route isn't wired yet) — not to mirror
    // the manifest.
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

    const uncovered = entitled.filter((moduleCode) =>
      !!moduleCode && !manifestModuleRefs.has(moduleCode));

    if (uncovered.length === 0) return [];

    return uncovered.map<DosNavItem>((moduleCode) => ({
      // Use the moduleCode itself as the nav id so any future L4
      // contribution under the same id supersedes (merge wins).
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
