import { Injectable, inject, signal } from '@angular/core';
import { AccessStore } from '@dos/access-store';

export interface AuthzData {
  accessProfiles: string[];
  permissions: string[];
  scopes: string[];
  functionalRoles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthzClientService {
  private readonly accessStore = inject(AccessStore);
  private readonly _authz = signal<AuthzData | null>(null);

  readonly authz = this._authz.asReadonly();

  setAuthorization(data: AuthzData): void {
    this._authz.set(data);
  }

  async loadPermissions(): Promise<void> {
    if (!this.accessStore.loaded()) {
      await this.accessStore.load();
    }

    if (!this.accessStore.loaded()) {
      this._authz.set(null);
      return;
    }

    this._authz.set({
      accessProfiles: this.accessStore.accessProfiles(),
      permissions: this.accessStore.permissions(),
      scopes: this.accessStore.visibleModules(),
      functionalRoles: this.accessStore.functionalRoles(),
    });
  }

  clear(): void {
    this._authz.set(null);
    this.accessStore.clear();
  }
}
