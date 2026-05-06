import { Injectable, signal, computed } from '@angular/core';

export interface BootstrapUser {
  userId: string;
  email?: string;
  name?: string;
  fullName?: string;
  roleCode: string;
  isSuperAdmin?: boolean;
  /** @deprecated Use userId. Kept for backward compatibility. */
  id?: string;
  roles?: string[];
}

export interface BootstrapTenant {
  tenantId: string;
  name?: string;
  status?: string;
  domain?: string;
  plan?: string;
  /** @deprecated Use tenantId. Kept for backward compatibility. */
  id?: string;
}

export interface BootstrapRoleProfile {
  roleCode: string;
  permissions?: string[];
}

export interface BootstrapWorkspace {
  sectors?: string[];
  enforcementMode?: string;
}

export interface BootstrapModule {
  moduleCode: string;
  enabled: boolean;
  label?: string;
}

export interface BootstrapData {
  user: BootstrapUser;
  tenant: BootstrapTenant;
  workspace?: BootstrapWorkspace | null;
  modules: BootstrapModule[];
  landingPage?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class BootstrapStore {
  private readonly _data = signal<BootstrapData | null>(null);

  readonly data = this._data.asReadonly();
  readonly loaded = computed(() => this._data() !== null);
  readonly user = computed(() => this._data()?.user ?? null);
  readonly tenant = computed(() => this._data()?.tenant ?? null);
  readonly workspace = computed(() => this._data()?.workspace ?? null);
  readonly modules = computed(() => this._data()?.modules ?? []);
  readonly landingPage = computed(() => this._data()?.landingPage ?? undefined);

  readonly roleProfile = computed<BootstrapRoleProfile | null>(() => {
    const u = this._data()?.user;
    return u ? { roleCode: u.roleCode, permissions: [] } : null;
  });

  set(data: BootstrapData): void {
    this._data.set(data);
  }

  setData(data: BootstrapData): void {
    this._data.set(data);
  }

  clear(): void {
    this._data.set(null);
  }
}
