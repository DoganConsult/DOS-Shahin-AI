import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '@app/infrastructure';
import { AuthStateService } from '../session/auth-state.service';

/**
 * Cookie-session auth guard.
 *
 * Browser auth truth is the cookie session, probed via AuthStateService.
 * No localStorage token is read or decoded. Legacy `grc_token` and
 * `grc_onboarding_complete` are removed defensively when unauthenticated.
 */
export const authGuard: CanActivateFn = async () => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const authState = inject(AuthStateService);

  if (authState.authed()) return true;
  const ok = await authState.probe();
  if (ok) return true;

  // Defensive cleanup of legacy storage keys (cookie session is authoritative).
  storage.remove('grc_token');
  storage.remove('grc_onboarding_complete');
  router.navigate(['/login']);
  return false;
};

/** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Use authGuard — will be removed in Phase 9. */
export const grcAuthGuard = authGuard;
