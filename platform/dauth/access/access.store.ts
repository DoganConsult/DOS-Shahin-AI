import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { intersectActiveModules } from '../../core/platform/navigation/active-modules';

/** Flat payload from gateway `GET /api/access/my-permissions` → tenant-service `GET /permissions`. */
export interface TenantPermissionsPayload {
  tenantId?: string;
  roles?: string[];
  permissions?: string[];
  modules?: string[];
}

export interface ScopeBinding {
  scopeType: string;
  scopeId: string;
  roleCode: string;
  moduleCode?: string;
}

@Injectable({ providedIn: 'root' })
export class AccessStore {
  private http = inject(HttpClient);
  private _loaded = signal(false);
  private _error = signal<string | null>(null);
  private _landingPage = signal('/workspace-home');
  private _permissions = signal<string[]>([]);
  private _visibleModules = signal<string[]>([]);
  private _functionalRoles = signal<string[]>([]);
  private _accessProfiles = signal<string[]>([]);
  private _accountStatus = signal<string>('active');
  private _isAdmin = signal(false);
  private _scopeBindings = signal<ScopeBinding[]>([]);
  private _decisionAuthorities = signal<string[]>([]);
  private _allowedDashboards = signal<string[]>([]);

  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();
  readonly permissions = this._permissions.asReadonly();
  readonly visibleModules = this._visibleModules.asReadonly();
  readonly functionalRoles = this._functionalRoles.asReadonly();
  readonly accessProfiles = this._accessProfiles.asReadonly();
  readonly accountStatus = this._accountStatus.asReadonly();
  readonly isAdmin = this._isAdmin.asReadonly();
  readonly scopeBindings = this._scopeBindings.asReadonly();
  readonly decisionAuthorities = this._decisionAuthorities.asReadonly();
  readonly allowedDashboards = this._allowedDashboards.asReadonly();

  landingPage(): string {
    return this._landingPage();
  }

  hasPermission(permission: string): boolean {
    return this._permissions().includes(permission);
  }

  hasAuthority(authorityCode: string): boolean {
    return this._decisionAuthorities().includes(authorityCode);
  }

  canAccessModule(moduleCode: string): boolean {
    return this._visibleModules().includes(moduleCode);
  }

  canAccessDashboard(dashboardCode: string): boolean {
    return this._allowedDashboards().includes(dashboardCode);
  }

  getScopeForRole(roleCode: string): ScopeBinding[] {
    return this._scopeBindings().filter(b => b.roleCode === roleCode);
  }

  /** Accepts raw JSON or `{ data: … }` wrapper for forward compatibility. */
  private parsePermissionsBody(body: unknown): TenantPermissionsPayload | null {
    if (!body || typeof body !== 'object') return null;
    const o = body as Record<string, unknown>;
    const inner = o.data !== undefined && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : o;
    const roles = Array.isArray(inner.roles) ? (inner.roles as string[]) : [];
    const permissions = Array.isArray(inner.permissions) ? (inner.permissions as string[]) : [];
    const modules = Array.isArray(inner.modules) ? (inner.modules as string[]) : [];
    const tenantId = typeof inner.tenantId === 'string' ? inner.tenantId : undefined;
    return { tenantId, roles, permissions, modules };
  }

  /** Derive admin from canonical role codes returned by tenant-service. */
  private deriveIsAdmin(roles: string[]): boolean {
    const hints = new Set([
      'tenant_admin',
      'platform_admin',
      'platform_super_admin',
      'superadmin',
      'tenant_owner',
    ]);
    return roles.some(r => {
      const n = String(r).toLowerCase().trim();
      if (hints.has(n)) return true;
      if (n.endsWith('_admin')) return true;
      return n.includes('owner') && n.includes('tenant');
    });
  }

  async load(): Promise<boolean> {
    // Auth truth is the httpOnly cookie validated server-side. Calling this
    // unconditionally with withCredentials lets the gateway/tenant-service
    // decide; 401/403 means no session and we land on an empty snapshot
    // without throwing during APP_INITIALIZER bootstrap.
    this._loaded.set(false);
    this._error.set(null);
    try {
      const body = await firstValueFrom(
        this.http.get<unknown>(`${environment.apiUrl}/access/my-permissions`, { withCredentials: true }),
      );
      const p = this.parsePermissionsBody(body);
      if (!p) {
        this._error.set('Invalid access permissions response');
        return false;
      }
      const roles = p.roles ?? [];
      const permissions = p.permissions ?? [];
      const modules = p.modules ?? [];
      // Platform-admin operators land directly in the platform admin
      // workspace (admin-hub) instead of the tenant workspace home, so
      // the 4D pillars + tenant lifecycle surface is one click away.
      const isPlatformAdmin = roles.some(r => {
        const n = String(r).toLowerCase().trim();
        return n === 'platform_admin' || n === 'platform_super_admin' || n === 'platform_owner' || n === 'dos_admin';
      });
      this.setSnapshot({
        landingPage: isPlatformAdmin ? '/admin-hub' : '/workspace-home',
        permissions,
        visibleModules: modules,
        functionalRoles: roles,
        accessProfiles: roles,
        accountStatus: 'active',
        isAdmin: this.deriveIsAdmin(roles),
        scopeBindings: [],
        decisionAuthorities: [],
        allowedDashboards: [],
      });
      return true;
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.clear();
        this._error.set('Not authenticated — empty access snapshot');
        return false;
      }
      const msg = err instanceof Error ? err.message : 'Access snapshot load failed';
      this._error.set(msg);
      return false;
    }
  }

  setSnapshot(data: {
    landingPage?: string;
    permissions?: string[];
    visibleModules?: string[];
    functionalRoles?: string[];
    accessProfiles?: string[];
    accountStatus?: string;
    isAdmin?: boolean;
    scopeBindings?: ScopeBinding[];
    decisionAuthorities?: string[];
    allowedDashboards?: string[];
  }): void {
    if (data.landingPage !== undefined) this._landingPage.set(data.landingPage);
    if (data.permissions !== undefined) this._permissions.set(data.permissions);
    if (data.visibleModules !== undefined) {
      // Foundation-only bring-up: fail-closed canonicalization. Wildcards or
      // unknown deferred modules MUST NOT bleed into the SPA visibility set.
      const intersected = intersectActiveModules(data.visibleModules);
      this._visibleModules.set(intersected);
    }
    if (data.functionalRoles !== undefined) this._functionalRoles.set(data.functionalRoles);
    if (data.accessProfiles !== undefined) this._accessProfiles.set(data.accessProfiles);
    if (data.accountStatus !== undefined) this._accountStatus.set(data.accountStatus);
    if (data.isAdmin != null) this._isAdmin.set(data.isAdmin);
    if (data.scopeBindings !== undefined) this._scopeBindings.set(data.scopeBindings);
    if (data.decisionAuthorities !== undefined) this._decisionAuthorities.set(data.decisionAuthorities);
    if (data.allowedDashboards !== undefined) this._allowedDashboards.set(data.allowedDashboards);
    this._loaded.set(true);
    this._error.set(null);
  }

  setError(err: string): void {
    this._error.set(err);
  }

  clear(): void {
    this._loaded.set(false);
    this._error.set(null);
    this._landingPage.set('/workspace-home');
    this._permissions.set([]);
    this._visibleModules.set([]);
    this._functionalRoles.set([]);
    this._accessProfiles.set([]);
    this._accountStatus.set('active');
    this._isAdmin.set(false);
    this._scopeBindings.set([]);
    this._decisionAuthorities.set([]);
    this._allowedDashboards.set([]);
  }
}
