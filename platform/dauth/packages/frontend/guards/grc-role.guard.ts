import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AccessStore } from '../access/access.store';

export const roleGuard: CanActivateFn = (route) => {
  const accessStore = inject(AccessStore);
  const requiredPermission = route.data?.['requiredPermission'] as string | undefined;
  if (!requiredPermission) return true;
  if (!accessStore.loaded()) return true;
  return accessStore.hasPermission(requiredPermission);
};

/** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Use roleGuard — will be removed in Phase 9. */
export const grcRoleGuard = roleGuard;
