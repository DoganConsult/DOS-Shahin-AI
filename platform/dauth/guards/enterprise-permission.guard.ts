import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AccessStore } from '../access/access.store';

export const enterprisePermissionGuard: CanActivateFn = (route) => {
  const accessStore = inject(AccessStore);
  if (!accessStore.loaded()) return true;
  const requiredPermission = route.data?.['requiredPermission'] as string | undefined;
  if (requiredPermission && !accessStore.hasPermission(requiredPermission)) return false;
  return true;
};
