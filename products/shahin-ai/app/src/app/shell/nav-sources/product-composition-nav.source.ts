// L4 — Product composition nav source (Shahin product-side).
//
// PRODUCT-SIDE FILE ONLY — lives here, NOT in @dos/access-store. Implements
// the platform NavSource interface (imported from @dos/access-store) by
// reading the bundled Shahin product manifest's `navigationComposition`
// (primary + secondary) and emitting product-specific nav items.
//
// Items here are product-specific — never DNA, never modules — typically
// extras the product adds beyond what the platform DNA + module library
// already provide (e.g., product-specific landing routes).
//
// Owns the MANIFEST_ICON_GLYPH map (moved here from the legacy adapter).

import { Injectable } from '@angular/core';
import type { DosNavItem } from '@dos/ui-contracts';
import type { NavCtx, NavSource, NavSourceResult } from '@dos/access-store';
import productManifest from '../../../../../product.manifest.json';

interface ManifestNavItem {
  id: string;
  label: string;
  route: string;
  icon?: string;
  moduleRef?: string;
}

interface ManifestNavComposition {
  primary?: ReadonlyArray<ManifestNavItem>;
  secondary?: ReadonlyArray<ManifestNavItem>;
}

/**
 * Map material-icon-style names from product manifest to single-glyph
 * emoji. The adapter normalises icons to monoglyph representations so
 * DosNavItem's icon column never overflows into the label column.
 */
const MANIFEST_ICON_GLYPH: Readonly<Record<string, string>> = {
  home:       '🏠',
  layers:     '📚',
  shield:     '🛡',
  check:      '✓',
  lock:       '🔒',
  file:       '📄',
  clipboard:  '📋',
  building:   '🏢',
  users:      '👥',
  settings:   '⚙',
  database:   '🗄',
  chart:      '📊',
  cube:       '📦',
  key:        '🔑',
  map:        '🗺',
  notebook:   '📓',
};

function normaliseIcon(raw: string | undefined, fallback = '📁'): string {
  if (!raw) return fallback;
  if ([...raw].length <= 2) return raw;
  return MANIFEST_ICON_GLYPH[raw] ?? fallback;
}

@Injectable({ providedIn: 'root' })
export class ProductCompositionNavSource implements NavSource {
  readonly id = 'product-composition';

  async resolve(_ctx: NavCtx): Promise<NavSourceResult> {
    const composition = (productManifest as { navigationComposition?: ManifestNavComposition })
      .navigationComposition ?? {};
    const primary = composition.primary ?? [];
    const secondary = composition.secondary ?? [];

    if (primary.length === 0 && secondary.length === 0) return null;

    const out: DosNavItem[] = [];
    primary.forEach((entry, idx) => {
      // Skip /workspace-home — survival fallback (L6) and Foundation DNA
      // already cover it; the product layer should not duplicate.
      if (entry.id === 'workspace-home') return;
      out.push(this.toItem(entry, 'primary', idx));
    });
    secondary.forEach((entry, idx) => {
      if (entry.id === 'workspace-home') return;
      out.push(this.toItem(entry, 'secondary', idx));
    });
    return out;
  }

  private toItem(entry: ManifestNavItem, group: string, _order: number): DosNavItem {
    return {
      id: entry.id,
      label: entry.label,
      route: entry.route,
      icon: normaliseIcon(entry.icon),
      moduleCode: entry.moduleRef,
      enabled: true, // filter pipeline downstream may flip
      group,
      ...({ __tier: 'product' } as Record<string, unknown>),
    } as DosNavItem;
  }
}
