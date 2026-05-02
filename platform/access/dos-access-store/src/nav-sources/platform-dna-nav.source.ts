import { Injectable, InjectionToken, Provider, inject } from '@angular/core';
import type { DosNavItem } from '@dos/ui-contracts';
import type { NavCtx, NavSource, NavSourceResult } from './nav-source';
import { DNA_MODULE_CODES } from '../platform-dna.registry';

/**
 * L2 — Platform DNA nav source.
 *
 * Emits DNA nav items for every platform/<x>/ that the host product has
 * registered a nav-contract loader for. Foundation today (18 items / 3 groups).
 * DAuth/DNOC/DSOC/DOS/AI surface here as their nav contracts land and are
 * registered via `provideDnaNavContractLoaders([...])` at app bootstrap.
 *
 * **Always emitted, never gated by entitlement.** Per-DNA-module health
 * gating is applied later via PlatformReadinessService in the filter pipeline.
 *
 * Why DI tokens (vs. relative imports): keeps @dos/access-store free of
 * cross-package paths into platform/foundation. The host product's bundler
 * resolves the JSON contracts and provides them via the loader registry.
 */

export interface DnaNavContract {
  items?: DnaNavJsonItem[];
}

export interface DnaNavJsonItem {
  id?: string;
  label?: string;
  labelKey?: string;
  route?: string;
  icon?: string;
  permission?: string;
  group?: string;
  order?: number;
}

export interface DnaContractLoader {
  moduleCode: string;
  load(): Promise<DnaNavContract | null>;
}

export const DNA_NAV_CONTRACT_LOADERS = new InjectionToken<DnaContractLoader[]>(
  'DNA_NAV_CONTRACT_LOADERS',
);

export function provideDnaNavContractLoaders(loaders: DnaContractLoader[]): Provider {
  return { provide: DNA_NAV_CONTRACT_LOADERS, useValue: loaders };
}

@Injectable({ providedIn: 'root' })
export class PlatformDnaNavSource implements NavSource {
  readonly id = 'platform-dna';
  private readonly loaders = inject(DNA_NAV_CONTRACT_LOADERS, { optional: true }) ?? [];

  async resolve(_ctx: NavCtx): Promise<NavSourceResult> {
    if (this.loaders.length === 0) return null;

    const items: DosNavItem[] = [];
    await Promise.all(
      this.loaders.map(async (loader) => {
        try {
          const nav = await loader.load();
          if (Array.isArray(nav?.items)) {
            for (const it of nav.items) {
              items.push(toDnaItem(it, loader.moduleCode));
            }
          }
        } catch {
          // Loader failed — surface via downstream filter pipeline.
        }
      }),
    );
    return items;
  }
}

function toDnaItem(it: DnaNavJsonItem, moduleCode: string): DosNavItem {
  return {
    id: String(it.id ?? `${moduleCode}.${it.route ?? 'unknown'}`),
    label: String(it.label ?? it.id ?? moduleCode),
    labelKey: it.labelKey,
    route: it.route,
    icon: it.icon,
    requiredPermission: typeof it.permission === 'string' ? it.permission : undefined,
    moduleCode,
    enabled: true, // health-pipeline overrides downstream
    group: typeof it.group === 'string' ? it.group : moduleCode,
    ...({ __tier: 'dna' } as Record<string, unknown>),
  } as DosNavItem;
}

export { DNA_MODULE_CODES };
