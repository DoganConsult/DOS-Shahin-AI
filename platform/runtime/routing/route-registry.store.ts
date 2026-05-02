// ============================================
// AGRC-OS — Route Registry Store
// Signal-based store that fetches the route
// catalog from /api/navigation/route-catalog
// and provides DB-driven module/route checks.
// ============================================

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';

export interface AllowedRoute {
  route: string;
  navKey: string;
  moduleCode: string | null;
  labelEn: string;
}

export interface ModuleRegistryEntry {
  displayNameEn: string;
  displayNameAr?: string;
  moduleCategory: string;
  automationLevel: string;
  licensed: boolean;
  isActive: boolean;
  hasLifecycle: boolean;
  icon: string | null;
  color: string | null;
  permissionPrefix: string;
  slaDefaultHours: number;
  sortOrder?: number;
  moduleCode?: string;
}

export interface RouteCatalogResponse {
  roleCode: string | null;
  modules: string[];
  dashboardWidgets: string[];
  defaultLandingPage: string;
  navigation: {
    primary: unknown[];
    secondary: unknown[];
  };
  allowedRoutes: AllowedRoute[];
  routeCount: number;
  moduleRegistry: Record<string, ModuleRegistryEntry>;
  moduleCount: number;
  entitlements: {
    licensedModules: unknown;
    operationMode: string;
    modulesConfig: unknown;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class RouteRegistryStore {
  private http = inject(HttpClient);

  // ── Signals ──
  private readonly _catalog = signal<RouteCatalogResponse | null>(null);
  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // ── Computed ──

  /** Active modules for this tenant (from bootstrap + module_workflow_registry) */
  readonly modules = computed(() => this._catalog()?.modules ?? []);

  /** Module registry entries keyed by moduleCode */
  readonly moduleRegistry = computed(() => this._catalog()?.moduleRegistry ?? {});

  /** Flat list of allowed routes from navigation_registry */
  readonly allowedRoutes = computed(() => this._catalog()?.allowedRoutes ?? []);

  /** Set of allowed route paths for O(1) lookup */
  readonly allowedRouteSet = computed(() => {
    const set = new Set<string>();
    for (const r of this.allowedRoutes()) {
      set.add(r.route);
    }
    return set;
  });

  /** DB-driven navigation tree */
  readonly navigation = computed(() => this._catalog()?.navigation ?? { primary: [], secondary: [] });

  /** Role code from bootstrap */
  readonly roleCode = computed(() => this._catalog()?.roleCode ?? null);

  /** Tenant entitlements */
  readonly entitlements = computed(() => this._catalog()?.entitlements ?? null);

  /** Default landing page */
  readonly landingPage = computed(() => this._catalog()?.defaultLandingPage ?? '/workspace-home');

  /** Full catalog (raw) */
  readonly catalog = computed(() => this._catalog());

  // ── Methods ──

  /**
   * Check if a module is active for this tenant.
   * Uses the module_workflow_registry (DB-driven).
   */
  hasModule(moduleCode: string): boolean {
    const mods = this.modules();
    if (mods.includes('*')) return true;
    if (mods.includes(moduleCode)) return true;

    // Also check module registry (licensed + active)
    const reg = this.moduleRegistry();
    const entry = reg[moduleCode];
    return !!entry?.licensed && !!entry?.isActive;
  }

  /**
   * Check if a specific route path is allowed for this user/tenant.
   * Uses navigation_registry (DB-driven, role+module filtered).
   */
  isRouteAllowed(route: string): boolean {
    if (!this.loaded()) return true; // Allow while loading (guards will re-check)
    const set = this.allowedRouteSet();
    if (set.size === 0) return true; // No catalog loaded yet, don't block
    // Normalize: strip leading slash
    const normalized = route.startsWith('/') ? route : `/${route}`;
    return set.has(normalized) || set.has(route);
  }

  /**
   * Get module metadata from the workflow registry.
   */
  getModuleEntry(moduleCode: string): ModuleRegistryEntry | null {
    return this.moduleRegistry()[moduleCode] ?? null;
  }

  /**
   * Get all licensed modules.
   */
  getLicensedModules(): string[] {
    const reg = this.moduleRegistry();
    return Object.entries(reg)
      .filter(([, entry]) => entry.licensed && entry.isActive)
      .map(([code]) => code);
  }

  /**
   * Load route catalog from API. Call after authentication.
   */
  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<RouteCatalogResponse>(`${environment.apiUrl}/navigation/route-catalog`)
      );
      this._catalog.set(data);
      this.loaded.set(true);
    } catch (err: unknown) {
      this.error.set((err as any)?.message ?? 'Failed to load route catalog');
      // Don't block the app — guards will use BootstrapStore as fallback
      this.loaded.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Reload (force refresh after module activation, role change, etc.)
   */
  async reload(): Promise<void> {
    this.loaded.set(false);
    this._catalog.set(null);
    await this.load();
  }

  /**
   * Clear store (on logout).
   */
  clear(): void {
    this._catalog.set(null);
    this.loaded.set(false);
    this.loading.set(false);
    this.error.set(null);
  }
}
