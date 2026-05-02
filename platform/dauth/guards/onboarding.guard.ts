import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../session/session.service';
import { AppBootstrapService } from '../../core/services/platform/app-bootstrap.service';
import { isWorkspaceReadyState } from '../session/bootstrap-state-machine';

export const onboardingGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  const bootstrapApi = inject(AppBootstrapService);

  if (session.isOnboardingComplete()) {
    return true;
  }

  try {
    const result = await firstValueFrom(bootstrapApi.loadSessionBootstrap());
    if (isWorkspaceReadyState(result?.state)) {
      session.setOnboardingComplete(true);
      return true;
    }
    if (result?.state === 'AUTHENTICATED_UNVERIFIED') {
      router.navigate(['/email-verification-pending']);
      return false;
    }
  } catch {
    // bootstrap unavailable — fall through to default-allow below
  }

  // onboarding-service is not deployed; redirecting to /onboarding causes
  // a redirect loop (route alias points back to /workspace-home). Mark the
  // session onboarding-complete and allow render so the workspace shell
  // can render against the cookie-validated session.
  session.setOnboardingComplete(true);
  return true;
};
