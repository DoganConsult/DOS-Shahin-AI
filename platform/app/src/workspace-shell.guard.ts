import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AccessStore } from '@dos/access-store';

/**
 * Blocks mounting workspace chrome until AccessStore has a coherent tenant session.
 * Anonymous / incomplete sessions redirect to `/login` with a stable reason query param.
 *
 * RACE FIX: The guard awaits AccessStore.load() (idempotent) before checking
 * loaded state. Without this, the guard fires before the bootstrap HTTP calls
 * complete and immediately redirects to /login?reason=no-session.
 */
export const workspaceShellGuard: CanActivateFn = async () => {
  const access = inject(AccessStore);
  const router = inject(Router);

  // Idempotent — returns immediately if already loaded. Prevents the race
  // where routing fires before bootstrap HTTP (/api/access/my-permissions,
  // /api/tenants/me) has completed.
  await access.load();

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
