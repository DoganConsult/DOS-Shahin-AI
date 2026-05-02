import { Injectable, inject } from '@angular/core';
import { AuthzClientService } from './authz-client.service';

export interface GrcRole {
  code: string;
  label: string;
  priority: number;
}

export interface GrcUserProfile {
  userId: string;
  roles: GrcRole[];
  highestRole: string;
  email?: string;
  name?: string;
  tenantId?: string;
  isSuperAdmin?: boolean;
}

export interface GrcAccessTokenClaims {
  sub: string;
  roles: string[];
  tenantId: string;
}

export const ROLE_PRIORITY: Record<string, number> = {
  platform_admin: 100,
  tenant_admin: 90,
  compliance_officer: 80,
  risk_manager: 70,
  auditor: 60,
  analyst: 50,
  viewer: 10,
};

export const FULL_ACCESS_ROLES = ['platform_admin', 'tenant_admin'];

export function mapHighestRole(roles: string[]): string {
  let highest = '';
  let highestPriority = -1;
  for (const role of roles) {
    const p = ROLE_PRIORITY[role] ?? 0;
    if (p > highestPriority) {
      highestPriority = p;
      highest = role;
    }
  }
  return highest || 'viewer';
}

export function extractUserProfile(claims: GrcAccessTokenClaims): GrcUserProfile {
  return {
    userId: claims.sub,
    roles: claims.roles.map(code => ({
      code,
      label: code.replace(/_/g, ' '),
      priority: ROLE_PRIORITY[code] ?? 0,
    })),
    highestRole: mapHighestRole(claims.roles),
  };
}

@Injectable({ providedIn: 'root' })
export class GrcRoleService {
  private readonly authz = inject(AuthzClientService);

  getRoleLandingPage(): string {
    const roles = this.authz.authz()?.functionalRoles ?? [];
    const highest = mapHighestRole(roles);
    if (FULL_ACCESS_ROLES.includes(highest)) return '/admin';
    return '/dashboard';
  }

  getRoleModules(): string[] {
    return this.authz.authz()?.accessProfiles ?? [];
  }
}
