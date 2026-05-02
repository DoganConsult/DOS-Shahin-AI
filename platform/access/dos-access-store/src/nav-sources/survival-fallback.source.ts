import { Injectable, inject } from '@angular/core';
import type { DosNavItem } from '@dos/ui-contracts';
import { AccessStore } from '../access.store';
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
export const CORE_WORKSPACE_NAV: ReadonlyArray<DosNavItem> = [
  { id: 'workspace.home', label: 'Workspace', route: '/workspace-home', enabled: true, group: 'core' },
  { id: 'workspace.profile', label: 'Profile', route: '/profile', enabled: true, group: 'core' },
  { id: 'workspace.settings', label: 'Settings', route: '/settings', enabled: true, group: 'core' },
  { id: 'workspace.tenant-profile', label: 'Tenant Profile', route: '/tenant-profile', enabled: true, group: 'core' },
  { id: 'workspace.tenant-settings', label: 'Tenant Settings', route: '/tenant-settings', enabled: true, group: 'core' },
];

@Injectable({ providedIn: 'root' })
export class SurvivalFallbackNavSource implements NavSource {
  readonly id = 'survival-fallback';
  private readonly access = inject(AccessStore);

  async resolve(_ctx: NavCtx): Promise<NavSourceResult> {
    if (this.access.loaded()) return null;
    return CORE_WORKSPACE_NAV.map((it) => ({
      ...it,
      ...({ __tier: 'product' } as Record<string, unknown>),
    } as DosNavItem));
  }
}
