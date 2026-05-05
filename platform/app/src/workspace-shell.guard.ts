import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AccessStore } from '@dos/access-store';

/**
 * Blocks mounting workspace chrome until AccessStore has a coherent tenant session.
 * Anonymous / incomplete sessions redirect to `/login` with a stable reason query param.
 */
export const workspaceShellGuard: CanActivateFn = () => {
  const access = inject(AccessStore);
  const router = inject(Router);

  if (!access.loaded()) {
    return router.parseUrl('/login?reason=no-session');
  }
  const tenantId = access.tenantId();
  if (tenantId == null || String(tenantId).trim() === '') {
    return router.parseUrl('/login?reason=no-tenant');
  }
  if (access.modules().length === 0) {
    return router.parseUrl('/login?reason=no-modules');
  }
  return true;
};
