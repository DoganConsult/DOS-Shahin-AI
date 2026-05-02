import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AccessStore } from '@dos/access-store';

/**
 * CanActivate guard for tenant-admin-only routes.
 *
 * If the access snapshot hasn't loaded yet, waits for the in-flight load.
 * On non-admin: redirects to /tenant-profile (read-only sibling) with a
 * `denied=tenant-admin` query param so the destination page can render
 * a soft "permission denied" toast/banner.
 *
 * Note: guards never throw on missing session — AccessStore
 * handles 401 by redirecting browser to OIDC start.
 */
export const tenantAdminGuard: CanActivateFn = async () => {
  const access = inject(AccessStore);
  const router = inject(Router);

  if (!access.loaded()) {
    await access.load();
  }

  if (access.isTenantAdmin()) return true;

  return router.createUrlTree(['/tenant-profile'], {
    queryParams: { denied: 'tenant-admin' },
  });
};
