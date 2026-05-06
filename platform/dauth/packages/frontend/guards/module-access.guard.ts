import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AccessStore } from '../access/access.store';

export const moduleAccessGuard: CanActivateFn = (route) => {
  const accessStore = inject(AccessStore);
  if (!accessStore.loaded()) return true;
  const moduleCode = route.data?.['moduleCode'] as string | undefined;
  if (!moduleCode) return true;
  if (accessStore.isAdmin()) return true;
  if (accessStore.canAccessModule(moduleCode)) return true;
  // No frontend fallback route: when access is denied, do not invent a
  // landing destination. Returning false blocks navigation; the SPA's
  // outer guard (DB-resolved landing route from
  // dos.tenant_landing_config via TenantLandingConfigService) is the
  // single source for any redirect target. NO FRONTEND INVENTION.
  return false;
};
