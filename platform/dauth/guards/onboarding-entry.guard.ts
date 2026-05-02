import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GrcAuthService } from '../../core/services/grc-auth.service';
import { AppBootstrapService } from '../../core/services/platform/app-bootstrap.service';
import { isWorkspaceReadyState } from '../session/bootstrap-state-machine';

export const onboardingEntryGuard: CanActivateFn = async () => {
  const auth = inject(GrcAuthService);
  const router = inject(Router);
  const bootstrapApi = inject(AppBootstrapService);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.isOnboardingComplete()) {
    router.navigate(['/workspace-home']);
    return false;
  }

  try {
    const result = await firstValueFrom(bootstrapApi.loadSessionBootstrap());
    const state = result?.state;
    if (isWorkspaceReadyState(state)) {
      auth.setOnboardingComplete(true);
      router.navigate(['/workspace-home']);
      return false;
    }
    if (state === 'AUTHENTICATED_UNVERIFIED') {
      router.navigate(['/email-verification-pending']);
      return false;
    }
  } catch {
  }

  return true;
};
