import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AccessStore } from '@dos/access-store';

/**
 * CanActivate guard for the workspace shell host route.
 *
 * Requirements (2026-05-04 vertical-slice doctrine, post-bridge):
 *   1. session loaded
 *   2. tenant resolved on the principal
 *   3. at least one module entitlement active
 *
 * Closes the empty-chrome regression where /workspace-home rendered for
 * anonymous visitors → ui-os-service /workspace-shell/<tenantId> returned
 * 401 → binding service flipped _loaded=true → all 30 surfaces gated false.
 *
 * Failure modes redirect to /login?reason=<no-session|no-tenant|no-modules>
 * so the auth bridge can render a precise error message.
 */
export const workspaceShellGuard: CanActivateFn = async () => {
  const access = inject(AccessStore);
  const router = inject(Router);

  if (!access.loaded()) {
    try { await access.load(); } catch { /* AccessStore handles 401 redirect */ }
  }

  if (!access.loaded()) {
    return router.createUrlTree(['/login'], { queryParams: { reason: 'no-session' } });
  }
  if (!access.tenantId()) {
    return router.createUrlTree(['/login'], { queryParams: { reason: 'no-tenant' } });
  }
  const mods = access.modules();
  if (!Array.isArray(mods) || mods.length === 0) {
    return router.createUrlTree(['/login'], { queryParams: { reason: 'no-modules' } });
  }
  return true;
};
