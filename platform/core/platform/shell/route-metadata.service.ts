/**
 * RouteMetadataService — caches dos.dynamic_ui_route_metadata.
 *
 * Used by DynamicTemplatePageComponent to decide whether to call
 * /api/ui-os/template-binding for the current route. Routes flagged
 * `render_mode = 'shell-only'` short-circuit before any template
 * binding HTTP call is fired, ensuring the workspace runtime envelope
 * remains the sole content authority for those routes.
 *
 * Routes flagged `render_mode = 'redirect'` carry a typed
 * DB-stored navigation contract under `metadata.redirect`:
 *   {
 *     "renderMode": "redirect",
 *     "templateBindingRequired": false,
 *     "redirect": {
 *       "anonymous":     "/login",
 *       "authenticated": "/workspace-home",
 *       "default":       "/login"
 *     }
 *   }
 *
 * Cache lifetime: page lifetime (one HTTP call per app load).
 */
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, shareReplay, catchError, map } from 'rxjs';

export type RouteRenderMode = 'template' | 'shell-only' | 'redirect';

export interface RouteRedirectContract {
  anonymous?: string;
  authenticated?: string;
  default?: string;
}

export interface RouteMetadata {
  route: string;
  renderMode: RouteRenderMode;
  templateBindingRequired: boolean;
  isPublic?: boolean;
  metadata?: { redirect?: RouteRedirectContract; [k: string]: unknown };
  version: number;
}

interface RouteMetadataResponse {
  routes: RouteMetadata[];
}

@Injectable({ providedIn: 'root' })
export class RouteMetadataService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/ui-os/route-metadata';
  private all$: Observable<ReadonlyMap<string, RouteMetadata>> | null = null;
  private readonly singleCache = new Map<string, Observable<RouteMetadata | null>>();

  /** Bulk-fetch + cache the full route-metadata table. */
  loadAll(): Observable<ReadonlyMap<string, RouteMetadata>> {
    if (this.all$) return this.all$;
    this.all$ = this.http
      .get<RouteMetadataResponse>(this.base)
      .pipe(
        map((r) => {
          const map = new Map<string, RouteMetadata>();
          for (const row of r?.routes ?? []) {
            if (row?.route) map.set(row.route, row);
          }
          return map as ReadonlyMap<string, RouteMetadata>;
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status !== 401 && err.status !== 403) {
            // eslint-disable-next-line no-console
            console.warn('[route-metadata] loadAll failed', err.status);
          }
          return of(new Map() as ReadonlyMap<string, RouteMetadata>);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.all$;
  }

  /**
   * Lookup by route — returns the row when present, or `null` when:
   *   - the route has no row in dos.dynamic_ui_route_metadata (unknown), OR
   *   - the public anonymous read returned 401 ROUTE_METADATA_UNAUTHENTICATED
   *     (the row exists but the caller is not authorised to read it; the
   *     server's 401 envelope's `redirect.default` is honoured by callers
   *     above the FE service layer through the gateway, not here).
   *
   * The FE never invents a render-mode classification — null means the
   * caller proceeds to the template-binding fallback path.
   */
  resolve(route: string): Observable<RouteMetadata | null> {
    const cached = this.singleCache.get(route);
    if (cached) return cached;
    const stream$ = this.http
      .get<RouteMetadata>(this.base, { params: { route } })
      .pipe(
        map((row) => row?.route ? row : null),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404 || err.status === 401 || err.status === 403) {
            // Anonymous-on-private (401) → null; absent (404) → null.
            // The bulk loadAll() path covers public listings.
            return of(null);
          }
          // eslint-disable-next-line no-console
          console.warn('[route-metadata] resolve failed', route, err.status);
          return of(null);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.singleCache.set(route, stream$);
    return stream$;
  }

  /** Test-only — clears the cache. */
  _reset(): void {
    this.all$ = null;
    this.singleCache.clear();
  }
}
