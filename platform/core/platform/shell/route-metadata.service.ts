/**
 * RouteMetadataService — caches dos.dynamic_ui_route_metadata.
 *
 * Used by DynamicTemplatePageComponent to decide whether to call
 * /api/ui-os/template-binding for the current route. Routes flagged
 * `render_mode = 'shell-only'` short-circuit before any template
 * binding HTTP call is fired, ensuring the workspace runtime envelope
 * remains the sole content authority for those routes.
 *
 * Cache lifetime: page lifetime (one HTTP call per app load).
 */
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, shareReplay, catchError, map } from 'rxjs';

export type RouteRenderMode = 'template' | 'shell-only' | 'redirect';

export interface RouteMetadata {
  route: string;
  renderMode: RouteRenderMode;
  templateBindingRequired: boolean;
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

  /** Lookup by route — returns null when the route is unknown. */
  resolve(route: string): Observable<RouteMetadata | null> {
    return this.loadAll().pipe(map((m) => m.get(route) ?? null));
  }

  /** Test-only — clears the cache. */
  _reset(): void {
    this.all$ = null;
  }
}
