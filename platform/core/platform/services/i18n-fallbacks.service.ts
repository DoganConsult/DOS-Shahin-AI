/**
 * Phase 1: DB-Driven Logo/Home-Link Configuration
 * Frontend service for i18n fallback values
 *
 * Consumes GET /api/ui-os/i18n-fallbacks/:tenantId
 * Returns tenant-specific i18n fallback values with global defaults.
 *
 * Eliminates hardcoded i18n fallback maps in workspace-resolver.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { AccessStore } from '@dos/access-store';

interface I18nFallback {
  i18nKey: string;
  fallbackValueEn: string;
  fallbackValueAr: string | null;
}

interface I18nFallbacksResponse {
  tenantId: string;
  fallbacks: I18nFallback[];
}

@Injectable({ providedIn: 'root' })
export class I18nFallbacksService {
  private readonly http = inject(HttpClient);
  private readonly access = inject(AccessStore);

  private readonly _fallbacks = signal<Map<string, I18nFallback>>(new Map());
  private readonly _loaded = signal(false);
  private readonly _tenantId = signal<string | null>(null);

  readonly fallbacks = this._fallbacks.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  // Auto-refresh when the active tenant flips
  private readonly tenantEffect = computed(() => {
    const tid = this.access.tenantId();
    if (!tid) {
      this._fallbacks.set(new Map());
      this._loaded.set(false);
      this._tenantId.set(null);
      return;
    }
    if (tid === this._tenantId()) return;
    this._tenantId.set(tid);
    queueMicrotask(() => { void this.refresh(); });
  });

  /**
   * Get fallback value for a given i18n key.
   * Returns English fallback if Arabic not available.
   */
  get(key: string, locale: 'en' | 'ar' = 'en'): string | null {
    const fallback = this._fallbacks().get(key);
    if (!fallback) return null;
    if (locale === 'ar' && fallback.fallbackValueAr) {
      return fallback.fallbackValueAr;
    }
    return fallback.fallbackValueEn;
  }

  /** Fetch the i18n fallbacks once for the active tenant. Idempotent. */
  async refresh(): Promise<void> {
    const tenantId = this._tenantId() ?? this.access.tenantId();
    if (!tenantId) return;
    const url = `/api/ui-os/i18n-fallbacks/${encodeURIComponent(tenantId)}`;
    const resp = await new Promise<I18nFallbacksResponse | null>((resolve) => {
      this.http.get<I18nFallbacksResponse>(url).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status !== 401 && err.status !== 403) {
            // eslint-disable-next-line no-console
            console.warn('[i18n-fallbacks] resolve failed', tenantId, err.status);
          }
          return of(null);
        }),
      ).subscribe((r) => resolve(r ?? null));
    });
    if (!resp) {
      this._fallbacks.set(new Map());
      this._loaded.set(true);
      return;
    }
    const map = new Map<string, I18nFallback>();
    for (const f of resp.fallbacks) {
      map.set(f.i18nKey, f);
    }
    this._fallbacks.set(map);
    this._loaded.set(true);
  }
}
