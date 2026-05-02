import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessStore } from '../access/access.store';

export const bootstrapGuard: CanActivateFn = () => {
  const accessStore = inject(AccessStore);
  const router = inject(Router);
  if (!accessStore.loaded()) return true;
  if (accessStore.accountStatus() === 'suspended' || accessStore.accountStatus() === 'locked') {
    router.navigate(['/login']);
    return false;
  }
  return true;
};
