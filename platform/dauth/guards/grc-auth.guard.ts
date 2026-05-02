import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GrcAuthService } from '../../core/services/grc-auth.service';

// Auth truth = cookie-backed session signal hydrated by GrcAuthService.init()
// from /api/auth/oidc/session (server-validated against KC JWKS). The SPA
// never sees the access token — guards must not consult localStorage.
export const authGuard: CanActivateFn = () => {
  const auth = inject(GrcAuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

/** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Use authGuard — will be removed in Phase 9. */
export const grcAuthGuard = authGuard;
