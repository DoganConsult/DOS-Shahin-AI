/**
 * Phase 1: DB-Driven Logo/Home-Link Configuration
 * Frontend service for tenant landing page configuration
 *
 * Consumes GET /api/ui-os/tenant-landing-config/:tenantId
 * Returns tenant-specific landing routes for different auth states.
 *
 * Eliminates hardcoded route fallbacks in landingGuard and PostAuthOrchestrator.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { AccessStore } from '@dos/access-store';

interface TenantLandingConfigResponse {
  tenantId: string;
  authenticatedRoute: string;
  unauthenticatedRoute: string;
  sessionExpiredRoute: string;
  postAuthRoute: string | null;
  enabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class TenantLandingConfigService {
  private readonly http = inject(HttpClient);
  private readonly access = inject(AccessStore);

  private readonly _config = signal<TenantLandingConfigResponse | null>(null);
  private readonly _loaded = signal(false);
  private readonly _tenantId = signal<string | null>(null);

  readonly config = this._config.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  // Computed properties for convenience
  readonly authenticatedRoute = computed(() => this._config()?.authenticatedRoute ?? '/workspace-home');
  readonly unauthenticatedRoute = computed(() => this._config()?.unauthenticatedRoute ?? '/');
  readonly sessionExpiredRoute = computed(() => this._config()?.sessionExpiredRoute ?? '/');
  readonly postAuthRoute = computed(() => this._config()?.postAuthRoute ?? this.authenticatedRoute());

  // Auto-refresh when the active tenant flips
  private readonly tenantEffect = computed(() => {
    const tid = this.access.tenantId();
    if (!tid) {
      this._config.set(null);
      this._loaded.set(false);
      this._tenantId.set(null);
      return;
    }
    if (tid === this._tenantId()) return;
    this._tenantId.set(tid);
    queueMicrotask(() => { void this.refresh(); });
  });

  /** Fetch the landing config once for the active tenant. Idempotent. */
  async refresh(): Promise<void> {
    const tenantId = this._tenantId() ?? this.access.tenantId();
    if (!tenantId) return;
    const url = `/api/ui-os/tenant-landing-config/${encodeURIComponent(tenantId)}`;
    const resp = await new Promise<TenantLandingConfigResponse | null>((resolve) => {
      this.http.get<TenantLandingConfigResponse>(url).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status !== 401 && err.status !== 403) {
            // eslint-disable-next-line no-console
            console.warn('[tenant-landing-config] resolve failed', tenantId, err.status);
          }
          return of(null);
        }),
      ).subscribe((r) => resolve(r ?? null));
    });
    if (!resp) {
      this._config.set(null);
      this._loaded.set(true);
      return;
    }
    this._config.set(resp);
    this._loaded.set(true);
  }
}
