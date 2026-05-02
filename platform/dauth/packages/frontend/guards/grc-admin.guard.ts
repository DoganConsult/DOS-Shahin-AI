import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AccessStore } from '../access/access.store';

export const adminGuard: CanActivateFn = () => {
  const accessStore = inject(AccessStore);
  if (!accessStore.loaded()) return false;
  return accessStore.isAdmin();
};

/** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Use adminGuard — will be removed in Phase 9. */
export const grcAdminGuard = adminGuard;
