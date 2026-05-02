import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import type { AccessSnapshot as FrontendAccessContract } from '../contracts/access-snapshot.model';

export interface ScopeBinding {
  scopeType: string;
  scopeId: string;
  roleCode: string;
  moduleCode?: string;
}

export interface UserPermissions {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  modules: string[];
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
  private _tenantId = signal<string>('');
  private _userId = signal<string>('');
  private _scopeBindings = signal<ScopeBinding[]>([]);
  private _decisionAuthorities = signal<string[]>([]);
  private _allowedDashboards = signal<string[]>([]);

  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();
  readonly tenantId = this._tenantId.asReadonly();
  readonly userId = this._userId.asReadonly();
  readonly permissions = this._permissions.asReadonly();
  readonly visibleModules = this._visibleModules.asReadonly();
  readonly functionalRoles = this._functionalRoles.asReadonly();
  readonly accessProfiles = this._accessProfiles.asReadonly();
  readonly accountStatus = this._accountStatus.asReadonly();
  readonly isAdmin = this._isAdmin.asReadonly();
  readonly scopeBindings = this._scopeBindings.asReadonly();
  readonly decisionAuthorities = this._decisionAuthorities.asReadonly();
  readonly allowedDashboards = this._allowedDashboards.asReadonly();

  permissionsState = computed<UserPermissions | null>(() => {
    if (!this._loaded()) return null;
    return {
      userId: this._userId(),
      tenantId: this._tenantId(),
      roles: this._functionalRoles(),
      permissions: this._permissions(),
      modules: this._visibleModules(),
    };
  });

  isLoading = computed(() => !this._loaded() && !this._error());
  isLoaded = computed(() => this._loaded());
  loadError = computed(() => this._error());
  userPermissions = computed(() => this._permissions());
  userRoles = computed(() => this._functionalRoles());
  userModules = computed(() => this._visibleModules());
  currentTenantId = computed<string | null>(() => this._tenantId() || null);
  currentUserId = computed<string | null>(() => this._userId() || null);

  landingPage(): string {
    return this._landingPage();
  }

  hasPermission(permission: string): boolean {
    const normalized = permission.toLowerCase().trim();
    const perms = this._permissions();
    return perms.some(p => {
      if (p === normalized) return true;
      if (p === '*') return true;
      if (p.endsWith('.*')) return normalized.startsWith(p.slice(0, -1));
      return false;
    });
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  can(permission: string): boolean {
    return this.hasPermission(permission);
  }

  hasRole(role: string): boolean {
    if (!this._loaded()) return false;
    return this._functionalRoles().includes(role.toLowerCase().trim());
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(r => this.hasRole(r));
  }

  hasAuthority(authorityCode: string): boolean {
    return this._decisionAuthorities().includes(authorityCode);
  }

  canAccessModule(moduleCode: string): boolean {
    return this._visibleModules().includes(moduleCode);
  }

  hasModuleAccess(moduleCode: string): boolean {
    return this.canAccessModule(moduleCode);
  }

  isSuperAdmin(): boolean {
    return this._isAdmin();
  }

  canAccessDashboard(dashboardCode: string): boolean {
    return this._allowedDashboards().includes(dashboardCode);
  }

  getScopeForRole(roleCode: string): ScopeBinding[] {
    return this._scopeBindings().filter(b => b.roleCode === roleCode);
  }

  async load(): Promise<boolean> {
    // Cookie-session: no token gate. The server is the single source of truth.
    // 401/403 → empty snapshot (unauthenticated / no access). Other errors → error state.
    this._loaded.set(false);
    this._error.set(null);
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: FrontendAccessContract }>(`${environment.apiUrl}/access/my-permissions`, { withCredentials: true }),
      );
      const contract = response.data;
      this.setSnapshot({
        tenantId: contract.tenant?.tenantId ?? '',
        userId: contract.actor?.userId ?? '',
        landingPage: contract.landingPage,
        permissions: contract.permissions ?? [],
        visibleModules: contract.modules ?? [],
        functionalRoles: contract.roles ?? [],
        accessProfiles: contract.accessProfiles ?? [],
        accountStatus: contract.tenant?.status ?? 'active',
        isAdmin: (contract.accessProfiles ?? []).some((profile) => profile === 'platform_super_admin' || profile === 'tenant_admin'),
        scopeBindings: (contract.scopeBindings ?? []).map((binding) => ({
          scopeType: binding.scopeType,
          scopeId: binding.scopeId,
          roleCode: binding.roleCode,
        })),
        decisionAuthorities: contract.decisionAuthorities ?? [],
        allowedDashboards: contract.dashboards ?? [],
      });
      return true;
    } catch (err: unknown) {
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      if (status === 401 || status === 403) {
        this.setSnapshot({
          tenantId: '',
          userId: '',
          permissions: [],
          visibleModules: [],
          functionalRoles: [],
          accessProfiles: [],
          accountStatus: 'inactive',
          isAdmin: false,
          scopeBindings: [],
          decisionAuthorities: [],
          allowedDashboards: [],
        });
        return false;
      }
      const message = err instanceof Error ? err.message : 'Access snapshot load failed';
      this._error.set(message);
      return false;
    }
  }

  loadPermissions(): Observable<UserPermissions> {
    if (this._loaded()) {
      return of(this.permissionsState()!);
    }
    return new Observable<UserPermissions>(subscriber => {
      this.load().then(success => {
        if (success) {
          subscriber.next(this.permissionsState()!);
          subscriber.complete();
        } else {
          subscriber.error(new Error(this._error() ?? 'Access snapshot load failed'));
        }
      }).catch(err => subscriber.error(err));
    });
  }

  reloadPermissions(): Observable<UserPermissions> {
    this.clear();
    return this.loadPermissions();
  }

  setSnapshot(data: {
    tenantId?: string;
    userId?: string;
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
    if (data.tenantId) this._tenantId.set(data.tenantId);
    if (data.userId) this._userId.set(data.userId);
    if (data.landingPage) this._landingPage.set(data.landingPage);
    if (data.permissions) this._permissions.set(data.permissions);
    if (data.visibleModules) this._visibleModules.set(data.visibleModules);
    if (data.functionalRoles) this._functionalRoles.set(data.functionalRoles);
    if (data.accessProfiles) this._accessProfiles.set(data.accessProfiles);
    if (data.accountStatus) this._accountStatus.set(data.accountStatus);
    if (data.isAdmin != null) this._isAdmin.set(data.isAdmin);
    if (data.scopeBindings) this._scopeBindings.set(data.scopeBindings);
    if (data.decisionAuthorities) this._decisionAuthorities.set(data.decisionAuthorities);
    if (data.allowedDashboards) this._allowedDashboards.set(data.allowedDashboards);
    this._loaded.set(true);
    this._error.set(null);
  }

  setError(err: string): void {
    this._error.set(err);
  }

  clearCache(): void {
    this.clear();
  }

  clear(): void {
    this._loaded.set(false);
    this._error.set(null);
    this._tenantId.set('');
    this._userId.set('');
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
