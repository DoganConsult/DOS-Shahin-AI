import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AccessStore } from '@dos/access-store';

/**
 * CanActivate guard for /foundation/* routes.
 *
 * Resolves three checks against the loaded AccessStore snapshot:
 *   1. session loaded (delegates to AccessStore.load() on first hit)
 *   2. tenant entitled to the foundation module
 *   3. caller has at least foundation.module.read
 *
 * Failure modes route to /workspace-home with a denied=<reason> query
 * param so the shell renders a clean denied state instead of a broken
 * /foundation page that 401s on every API call.
 */
export const foundationGuard: CanActivateFn = async () => {
  const access = inject(AccessStore);
  const router = inject(Router);

  if (!access.loaded()) {
    try { await access.load(); } catch { /* AccessStore handles 401 redirect */ }
  }

  if (!access.modules().includes('foundation')) {
    return router.createUrlTree(['/workspace-home'], { queryParams: { denied: 'foundation-not-entitled' } });
  }

  if (!access.hasPermission('foundation.module.read')) {
    return router.createUrlTree(['/workspace-home'], { queryParams: { denied: 'foundation-module-read' } });
  }

  return true;
};
