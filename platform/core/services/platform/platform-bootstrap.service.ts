import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface PlatformBootstrapConfig {
  platformVersion: string;
  features: Record<string, boolean>;
  maintenance: boolean;
}

export interface BootstrapContextEntitlements {
  ui: {
    // DB-resolved (dos.tenant_landing_config) per-role landing overrides.
    tenantLandingRouteByRole?: Record<string, string>;
    // DB-resolved tenant landing route. null = operator has not seeded;
    // SPA must render empty/no-op (NO FRONTEND INVENTION).
    tenantLandingRoute?: string | null;
  };
}

export interface BootstrapContextData {
  tenantStatus: string;
  firstLoginCompleted: boolean;
}

export interface BootstrapContext {
  entitlements: BootstrapContextEntitlements;
  bootstrap: BootstrapContextData;
}

@Injectable({ providedIn: 'root' })
export class PlatformBootstrapService {
  private readonly http = inject(HttpClient);

  loadPlatformConfig(): Observable<PlatformBootstrapConfig> {
    return this.http.get<PlatformBootstrapConfig>('/api/platform/bootstrap').pipe(
      catchError(() => of({
        platformVersion: '1.0.0',
        features: {},
        maintenance: false,
      })),
    );
  }

  /**
   * Loads the full bootstrap context needed by the bootstrap guard.
   * Returns entitlements (UI routing config) and bootstrap state (tenant status, first login).
   */
  loadBootstrapContext(): Observable<BootstrapContext> {
    return forkJoin({
      config: this.http.get<Record<string, unknown>>('/api/platform/bootstrap').pipe(
        catchError(() => of({} as Record<string, unknown>)),
      ),
      entitlements: this.http.get<Record<string, unknown>>('/api/entitlements').pipe(
        catchError(() => of({} as Record<string, unknown>)),
      ),
    }).pipe(
      map(({ config, entitlements }) => ({
        entitlements: {
          ui: {
            tenantLandingRouteByRole: (entitlements['ui'] as Record<string, unknown>)?.['tenantLandingRouteByRole'] as Record<string, string> | undefined,
            tenantLandingRoute: ((entitlements['ui'] as Record<string, unknown>)?.['tenantLandingRoute'] as string | null | undefined) ?? null,
          },
        },
        bootstrap: {
          tenantStatus: (config['tenantStatus'] as string) ?? 'active',
          firstLoginCompleted: (config['firstLoginCompleted'] as boolean) ?? true,
        },
      })),
    );
  }
}
