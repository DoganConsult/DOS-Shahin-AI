/**
 * Route guard that gates Foundation pages by permission code.
 *
 * Reads the canonical codes from `@dos/module-foundation/contracts` so a
 * rename of a permission breaks the guard at compile time.
 *
 * The guard is advisory — backend permission checks are the security
 * boundary. UI gating only avoids unnecessary navigation.
 */
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { FOUNDATION_PERMISSION_CODES } from '@dos/module-foundation/contracts';

export interface PermissionResolver {
  has(code: string): boolean;
}
export const PERMISSION_RESOLVER = Symbol.for('foundation.permission-resolver');

export function foundationPermissionGuard(...required: string[]): CanActivateFn {
  return (route) => {
    const router = inject(Router);
    const resolver = inject<PermissionResolver>(PERMISSION_RESOLVER as never);
    const explicit: string[] = (route.data?.['permissions'] as string[]) ?? [];
    const codes = required.length ? required : explicit;
    const ok = codes.length === 0 || codes.every((c) => resolver.has(c));
    if (ok) return true;
    router.navigateByUrl('/access-denied');
    return false;
  };
}

export const FOUNDATION_GUARDS = {
  orgRead:    foundationPermissionGuard(FOUNDATION_PERMISSION_CODES.ORG_READ),
  orgWrite:   foundationPermissionGuard(FOUNDATION_PERMISSION_CODES.ORG_WRITE),
  recordRead: foundationPermissionGuard(FOUNDATION_PERMISSION_CODES.RECORD_READ),
  manage:     foundationPermissionGuard(FOUNDATION_PERMISSION_CODES.ADMIN_MANAGE),
} as const;
