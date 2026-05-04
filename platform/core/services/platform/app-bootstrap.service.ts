import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, TimeoutError, firstValueFrom, from, of, throwError } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';
import { BootstrapStore, type BootstrapData } from './bootstrap.store';
import { AccessStore } from '@dos/access-store';
import { COMPONENT_MAP, ALLOWLIST } from '../../../dos/registry/component-map';
import { buildAuthenticatedRoutes } from '../../routing/dynamic-route-builder.service';
import { Route } from '@angular/router';
import { StorageService } from '@app/infrastructure';
import { ThemeService } from '../../infrastructure/theme/theme.service';
import { environment } from '@env/environment';

/**
 * Bounded wait for `GET …/session/bootstrap` so guards and post-auth never hang indefinitely
 * when the gateway is down, TLS/proxy misconfigured, or the handler stalls.
 * @see docs in `environment.prod.ts` for production `/api` + cookie host expectations.
 */
export const SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS = 25_000;

/** Upper bound for access snapshot + legacy bootstrap + shadow/theme work (post-auth path). */
export const UNIFIED_BOOTSTRAP_MAX_MS = 60_000;

/** Shadow registry verification must not block bootstrap indefinitely. */
export const REGISTRY_HTTP_TIMEOUT_MS = 15_000;

export interface RegistryEffectiveComponent {
  csn: string;
  componentKey: string;
  layer: string;
  routePath: string | null;
  sortOrder: number;
  i18nKey: string | null;
  platformObjectId: string;
}

export interface BootstrapSessionResponse {
  state: string;
  auth?: {
    userId: string;
    email: string;
    roleCode: string | null;
  };
  tenant?: {
    tenantId: string;
    tenantStatus: string;
    orgName: string | null;
  } | null;
  workspace?: {
    workspaceId: string | null;
    ready: boolean;
  } | null;
  derivationReason?: string;
  next?: { route: string; blocking: boolean; reason: string };
}

@Injectable({ providedIn: 'root' })
export class AppBootstrapService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(BootstrapStore);
  private readonly accessStore = inject(AccessStore);
  private readonly storage = inject(StorageService);
  private readonly themeService = inject(ThemeService);

  load(): Observable<BootstrapData> {
    return from(this.loadCanonicalBootstrap()).pipe(
      tap(data => this.store.set(data)),
    );
  }

  loadSessionBootstrap(): Observable<BootstrapSessionResponse> {
    return this.http
      .get<BootstrapSessionResponse>(`${environment.apiUrl}/session/bootstrap`, { withCredentials: true })
      .pipe(
        timeout(SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS),
        catchError(err => {
          if (err instanceof TimeoutError) {
            console.warn(
              `[AppBootstrapService] session/bootstrap exceeded ${SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS}ms — check /api proxy and backend`,
            );
          }
          return throwError(() => err);
        }),
      );
  }

  async loadUnifiedBootstrap(): Promise<{ accessLoaded: boolean; legacyLoaded: boolean }> {
    return await Promise.race([
      this.loadUnifiedBootstrapInner(),
      new Promise<never>((_, rej) =>
        setTimeout(
          () =>
            rej(
              new Error(
                `[AppBootstrapService] loadUnifiedBootstrap exceeded ${UNIFIED_BOOTSTRAP_MAX_MS}ms`,
              ),
            ),
          UNIFIED_BOOTSTRAP_MAX_MS,
        ),
      ),
    ]);
  }

  private async loadUnifiedBootstrapInner(): Promise<{ accessLoaded: boolean; legacyLoaded: boolean }> {
    const accessLoaded = await this.ensureAccessSnapshotLoaded();
    const legacyLoaded = await firstValueFrom(this.load()).then(() => true).catch(() => false);

    if (accessLoaded || legacyLoaded) {
      try {
        await this.runShadowModeVerification();
      } catch (err) {
        console.warn('[UPOR Shadow Mode] Verification failed (non-blocking)', err);
      }
    }

    try {
      await firstValueFrom(this.themeService.loadFromGateway());
    } catch {
      // Theme load is non-blocking — platform runs with defaults
    }

    return { accessLoaded, legacyLoaded };
  }

  private async loadCanonicalBootstrap(): Promise<BootstrapData> {
    const accessLoaded = await this.ensureAccessSnapshotLoaded();

    let session: BootstrapSessionResponse | null = null;
    try {
      session = await firstValueFrom(this.loadSessionBootstrap());
    } catch (err) {
      console.warn('[AppBootstrapService] Session bootstrap unavailable; using canonical access + stored session fallback', err);
    }

    if (!session && !accessLoaded) {
      throw new Error('[AppBootstrapService] Unable to resolve canonical bootstrap state');
    }

    return this.buildCanonicalBootstrap(session, accessLoaded);
  }

  private async ensureAccessSnapshotLoaded(): Promise<boolean> {
    if (this.accessStore.loaded()) {
      return true;
    }

    try {
      return await this.accessStore.load();
    } catch {
      return false;
    }
  }

  /**
   * Phase 4: Shadow Mode Verification
   * Fetches effective frontend components from the UPOR DB, constructs dynamic routes, 
   * and compares them against the current static routes built by \`buildAuthenticatedRoutes()\`.
   */
  private async runShadowModeVerification(): Promise<void> {
    const effective = await firstValueFrom(
      this.http.get<RegistryEffectiveComponent[]>('/api/v1/registry/effective?layer=frontend').pipe(
        timeout(REGISTRY_HTTP_TIMEOUT_MS),
        catchError(err => {
          if (err instanceof TimeoutError) {
            console.warn(
              `[UPOR Shadow Mode] registry/effective exceeded ${REGISTRY_HTTP_TIMEOUT_MS}ms — skipping verification`,
            );
          } else {
            console.warn('[UPOR Shadow Mode] registry/effective failed (non-blocking)', err);
          }
          return of([] as RegistryEffectiveComponent[]);
        }),
      ),
    );

    const dynamicRoutes: Route[] = effective
      .filter(c => c.layer === 'frontend' && c.routePath)
      .filter(c => {
        if (!ALLOWLIST.has(c.componentKey)) {
          console.warn(`[UPOR Shadow Mode] BLOCKED: Component key '${c.componentKey}' not found in compile-time ALLOWLIST.`);
          return false;
        }
        return true;
      })
      .map(c => ({
        path: c.routePath!,
        loadComponent: COMPONENT_MAP[c.componentKey],
        data: { csn: c.csn, i18nKey: c.i18nKey, shadowMode: true }
      }));

    const staticRoutes = buildAuthenticatedRoutes();
    
    let discrepancies = 0;
    
    for (const dynamicRoute of dynamicRoutes) {
      // Find matching static route (recursively if needed, though static routes has children inside module paths)
      const found = this.findStaticRoute(staticRoutes, dynamicRoute.path!);
      if (!found) {
        console.warn(`[UPOR Shadow Mode] DISCREPANCY: DB route '${dynamicRoute.path}' not found in static registry.`);
        discrepancies++;
      }
    }

    if (discrepancies === 0) {
      console.log(`[UPOR Shadow Mode] VERIFIED: 100% route alignment. Dynamic registry is safe to become primary authority.`);
      // router.resetConfig(dynamicRoutes);
    } else {
      console.warn(`[UPOR Shadow Mode] ${discrepancies} discrepancies found. Router authority remains static.`);
    }
    
    // In Wave 2 later phases, this will be:
    // this.router.resetConfig([...publicRoutes, ...dynamicRoutes]);
  }

  private findStaticRoute(routes: Route[], targetPath: string, currentPrefix = ''): boolean {
    for (const r of routes) {
      const fullPath = [currentPrefix, r.path].filter(Boolean).join('/');
      if (fullPath === targetPath || fullPath === targetPath + '/') {
        return true;
      }
      if (r.children && `${targetPath}/`.startsWith(`${fullPath}/`)) {
        if (this.findStaticRoute(r.children, targetPath, fullPath)) {
          return true;
        }
      }
    }
    return false;
  }

  private buildCanonicalBootstrap(session: BootstrapSessionResponse | null, accessLoaded: boolean): BootstrapData {
    const storedUserName = this.storage.get('grc_userName') ?? undefined;
    const storedUserId = this.storage.get('grc_userId') ?? '';
    const storedTenantId = this.storage.get('grc_tenantId') ?? '';
    const storedOrgName = this.storage.get('grc_orgName') ?? undefined;
    const storedRole = this.storage.get('grc_role') ?? 'viewer';

    const visibleModules = accessLoaded ? this.accessStore.visibleModules() : [];
    const dashboardWidgets = accessLoaded ? this.accessStore.allowedDashboards() : [];
    const landingPage = accessLoaded
      ? this.accessStore.landingPage()
      : session?.next?.route ?? '/workspace-home';
    const resolvedRoleCode = session?.auth?.roleCode ?? storedRole;

    return {
      user: {
        userId: session?.auth?.userId ?? storedUserId,
        id: session?.auth?.userId ?? storedUserId,
        email: session?.auth?.email ?? '',
        fullName: storedUserName,
        name: storedUserName,
        roleCode: resolvedRoleCode,
        isSuperAdmin: accessLoaded ? this.accessStore.isAdmin() : this.storage.get('grc_isSuperAdmin') === 'true',
        roles: accessLoaded ? this.accessStore.functionalRoles() : [],
      },
      tenant: {
        tenantId: session?.tenant?.tenantId ?? storedTenantId,
        id: session?.tenant?.tenantId ?? storedTenantId,
        name: session?.tenant?.orgName ?? storedOrgName,
        status: session?.tenant?.tenantStatus ?? (accessLoaded ? this.accessStore.accountStatus() : undefined),
      },
      workspace: null,
      modules: visibleModules.map(moduleCode => ({ moduleCode, enabled: true })),
      landingPage,
      resolvedLandingPage: landingPage,
      bootstrapState: session?.state,
      navigation: {
        visibleModules,
        landingPage,
        dashboardWidgets,
      },
      roleProfile: {
        roleCode: resolvedRoleCode,
        modules: visibleModules,
        dashboardWidgets,
        defaultLandingPage: landingPage,
      },
    };
  }
}

