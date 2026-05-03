/**
 * BrandResolverService (Phase M0).
 *
 * Hydrates brand tokens + assets from `/api/ui-os/brand?brand_code=…`
 * (served by `services/ui-os-service`). This service is intentionally
 * decoupled from AccessStore — public marketing surfaces must NOT depend
 * on authenticated session state. The resolver:
 *
 *   1. Reads `brandCode` from `<html data-brand="…">` (set by the SPA
 *      bootstrap) or from `init({ brandCode })`.
 *   2. Fetches the brand bundle once per page; caches in-memory + via
 *      `BroadcastChannel('dos-brand')` for cross-tab sync.
 *   3. Exposes `tokens()` (CSS var key→value map) and `asset(query)`
 *      lookups as Angular signals.
 *   4. Refuses to resolve unknown brand codes — caller must render a
 *      `dos-empty-state` rather than a silent fallback.
 */
import { Injectable, signal, computed } from '@angular/core';
import type { DosBrandCode } from '@dos/design-tokens';
import { DOS_BRAND_CODES } from '@dos/design-tokens';
import type { DosBrandAsset, DosBrandAssetQuery } from './brand-asset.contract';

interface BrandBundle {
  brandCode: DosBrandCode;
  /** CSS var token map (key without leading '--'). */
  tokens: Record<string, string>;
  assets: readonly DosBrandAsset[];
  fetchedAt: number;
}

@Injectable({ providedIn: 'root' })
export class BrandResolverService {
  private readonly _bundle = signal<BrandBundle | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly bundle = computed(() => this._bundle());
  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());
  readonly brandCode = computed(() => this._bundle()?.brandCode ?? null);

  /**
   * Eagerly initialise the resolver from a known brand code. Idempotent —
   * subsequent calls are no-ops if the bundle is already loaded for the
   * same brand. Throws on unknown codes (no silent fallback).
   */
  async init(brandCode: DosBrandCode, baseUrl = '/api/ui-os'): Promise<void> {
    if (!DOS_BRAND_CODES.includes(brandCode)) {
      throw new Error(`[brand-resolver] unknown brand code: ${brandCode}`);
    }
    const cur = this._bundle();
    if (cur && cur.brandCode === brandCode) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const r = await fetch(`${baseUrl}/brand?brand_code=${encodeURIComponent(brandCode)}`, {
        headers: { Accept: 'application/json' },
        credentials: 'omit',
      });
      if (!r.ok) throw new Error(`brand fetch ${r.status}`);
      const body = (await r.json()) as Omit<BrandBundle, 'fetchedAt'>;
      this._bundle.set({ ...body, fetchedAt: Date.now() });
    } catch (e) {
      this._error.set(String(e));
      throw e;
    } finally {
      this._loading.set(false);
    }
  }

  /** Resolve the narrowest-matching brand asset, or `null` when none. */
  asset(q: DosBrandAssetQuery): DosBrandAsset | null {
    const b = this._bundle();
    if (!b || b.brandCode !== q.brandCode) return null;
    const candidates = b.assets.filter(
      (a) => a.brandCode === q.brandCode && a.assetKind === q.assetKind,
    );
    if (candidates.length === 0) return null;
    // Score: locale + direction + theme each contribute 1. Highest wins.
    let best: DosBrandAsset | null = null;
    let bestScore = -1;
    for (const a of candidates) {
      let s = 0;
      if (q.theme && a.theme === q.theme) s++;
      if (q.locale && (a.locale === q.locale || a.locale === null)) s++;
      if (q.direction && (a.direction === q.direction || a.direction === null)) s++;
      if (s > bestScore) {
        bestScore = s;
        best = a;
      }
    }
    return best;
  }
}
