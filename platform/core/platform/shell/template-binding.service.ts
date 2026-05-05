/**
 * Phase F-F3 — DB-Driven UI Template Binding client.
 *
 * Calls `GET /api/ui-os/template-binding?route=<route>` and returns the
 * archetype + canonical template export name + merged props (KPIs, columns,
 * tabs, NBA, settings sections, report cards, workqueue groups, heatmap
 * axes) for the requested route.
 *
 * Server contract: services/ui-os-service/src/routes/template-binding.routes.ts.
 * Migrations:      platform/dos/migrations/public/20260503_0017,0018.
 *
 * Caching:
 *   - In-memory map keyed by route. Warmed by `prefetchAll()` (used by SPA
 *     bootstrap).
 *   - Fail-soft: any HTTP error resolves to a null-binding so the host can
 *     fall back to the legacy component-map renderer.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, shareReplay } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import type { ModuleInsightPillars } from './templates/module-template.types';

export interface TemplateBindingProps {
  kpis?: unknown[];
  columns?: unknown[];
  tabs?: unknown[];
  nextBestActions?: unknown[];
  settingsSections?: unknown[];
  reportCards?: unknown[];
  workqueueGroups?: unknown[];
  heatmapAxes?: unknown[];
  pillars?: ModuleInsightPillars;
  [k: string]: unknown;
}

export interface TemplateBinding {
  route: string;
  archetype: string | null;
  template_export: string | null;
  permission_key?: string | null;
  props: TemplateBindingProps;
  version: number;
}

const NULL_BINDING = (route: string): TemplateBinding => ({
  route,
  archetype: null,
  template_export: null,
  permission_key: null,
  props: {},
  version: 0,
});

@Injectable({ providedIn: 'root' })
export class TemplateBindingService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<TemplateBinding>>();
  private readonly base = '/api/ui-os/template-binding';

  /** Resolve the binding for a single route. Cached for the page lifetime. */
  resolve(route: string): Observable<TemplateBinding> {
    if (!route) return of(NULL_BINDING(route));
    const cached = this.cache.get(route);
    if (cached) return cached;

    const stream$ = this.http
      .get<TemplateBinding>(this.base, { params: { route } })
      .pipe(
        map(b => b ?? NULL_BINDING(route)),
        catchError((err: HttpErrorResponse) => {
          if (err.status !== 401 && err.status !== 403) {
            // Avoid noisy logs during sign-out / unauthenticated SSR.
            // eslint-disable-next-line no-console
            console.warn('[template-binding] resolve failed', route, err.status);
          }
          return of(NULL_BINDING(route));
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.cache.set(route, stream$);
    return stream$;
  }

  /** Bulk-warm the cache from `/template-binding/all`. Idempotent. */
  prefetchAll(): Observable<TemplateBinding[]> {
    return this.http
      .get<{ bindings: TemplateBinding[] }>(`${this.base}/all`)
      .pipe(
        map(r => r?.bindings ?? []),
        tap(rows => {
          for (const b of rows) {
            const full: TemplateBinding = { ...NULL_BINDING(b.route), ...b };
            this.cache.set(b.route, of(full));
          }
        }),
        catchError(() => of([] as TemplateBinding[])),
      );
  }

  /** Test-only — not exported to the SPA bundle's public surface. */
  _reset(): void {
    this.cache.clear();
  }
}
