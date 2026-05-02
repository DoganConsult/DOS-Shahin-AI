import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessStore } from '../access/access.store';

export const moduleAccessGuard: CanActivateFn = (route) => {
  const accessStore = inject(AccessStore);
  const router = inject(Router);
  if (!accessStore.loaded()) return true;
  const moduleCode = route.data?.['moduleCode'] as string | undefined;
  if (!moduleCode) return true;
  if (accessStore.isAdmin()) return true;
  if (accessStore.canAccessModule(moduleCode)) return true;
  router.navigate(['/workspace-home']);
  return false;
};
