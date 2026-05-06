import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '@app/infrastructure';
import { AuthStateService } from '../session/auth-state.service';
import { TenantLandingConfigService } from '../services/tenant-landing-config.service';

/**
 * Cookie-session landing guard.
 *
 * Browser auth truth is the cookie session, probed via AuthStateService.
 * No JWT decode, no token read from storage. Legacy `grc_token` /
 * `grc_onboarding_complete` cleanup remains as a defensive measure for
 * users upgrading from older token-based builds.
 */
export const landingGuard: CanActivateFn = async () => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const authState = inject(AuthStateService);
  const landingConfig = inject(TenantLandingConfigService);

  // Defensive cleanup of legacy storage keys — cookie session is authoritative.
  storage.remove('grc_token');

  const authed = authState.authed() || (await authState.probe());
  if (!authed) {
    storage.remove('grc_onboarding_complete');
    return true;
  }

  const onboardingComplete = storage.get('grc_onboarding_complete');
  if (onboardingComplete === 'true') {
    // Landing route is owned by dos.tenant_landing_config (UI-OS resolver).
    // If the resolver returned 404 / no row, the guard does not invent
    // a route — it returns true so the routed component renders empty.
    if (!landingConfig.loaded()) await landingConfig.refresh();
    const target = landingConfig.authenticatedRoute();
    if (!target) return true;
    router.navigateByUrl(target);
    return false;
  }
  router.navigate(['/onboarding']);
  return false;
};
