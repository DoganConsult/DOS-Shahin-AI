import { Injectable, inject } from '@angular/core';
import { AuthzClientService } from './authz-client.service';

export const PERMISSION_MAP: Record<string, string[]> = {};
export const LEGACY_TO_ENTERPRISE_FE: Record<string, string> = {};

export function checkPermission(permissions: string[], code: string): boolean {
  return permissions.includes(code) || permissions.includes('*');
}

@Injectable({ providedIn: 'root' })
export class GrcPermissionService {
  private readonly authz = inject(AuthzClientService);

  hasPermission(permission: string): boolean {
    return checkPermission(this.authz.authz()?.permissions ?? [], permission);
  }

  hasEnterprisePermission(code: string): boolean {
    const mapped = LEGACY_TO_ENTERPRISE_FE[code] ?? code;
    return this.hasPermission(mapped);
  }

  canAccessModule(moduleCode: string): boolean {
    const scopes = this.authz.authz()?.scopes ?? [];
    return scopes.includes(moduleCode) || scopes.includes('*');
  }

  async hasFunction(functionCode: string): Promise<boolean> {
    return this.hasPermission(functionCode);
  }

  clearCache(): void {
    // Permission state is held by AuthzClientService
  }
}
