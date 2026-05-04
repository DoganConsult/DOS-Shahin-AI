import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlatformAdminApiService } from './platform-admin-api.service';

export const platformAdminGuard: CanActivateFn = async (_route, state) => {
  const api = inject(PlatformAdminApiService);
  const router = inject(Router);
  const who = await api.whoami();
  if (who) return true;
  return router.createUrlTree(['/platform-admin/login'], {
    queryParams: { returnTo: state.url },
  });
};
