import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { PlatformBootstrapService } from '../../services/platform-bootstrap.service';
import { StorageService } from '@app/infrastructure';

export const bootstrapGuard: CanActivateFn = () => {
  const _storage = inject(StorageService);
  const router = inject(Router);
  const service = inject(PlatformBootstrapService);

  return service.loadBootstrapContext().pipe(
    map(({ entitlements, bootstrap }) => {
      // Tenant still provisioning
      if (bootstrap.tenantStatus === 'provisioning') {
        return router.createUrlTree(['/provisioning-status']);
      }

      // Onboarding-flow redirect disabled until services/onboarding-service
      // is mounted on the gateway. The /onboarding shell would 404 on every
      // API call (config/stages, questions, sessions, …) and render the
      // hard error overlay. Landing page comes from UI-OS runtime.
      void bootstrap.tenantStatus;

      // First-login checklist also routes through onboarding-only APIs;
      // skip until backend is available.
      void bootstrap.firstLoginCompleted;

      const tenantId = _storage.get('grc_tenantId') || '';
      const cockpitKey = tenantId ? `grc_cockpit_shown_${tenantId}` : 'grc_cockpit_shown';
      if (!_storage.get(cockpitKey)) {
        _storage.set(cockpitKey, 'true');
      }

      const userRole = _storage.get('grc_role') ?? 'viewer';
      // DB-resolved landing route only (dos.tenant_landing_config via
      // UI-OS resolver). null = operator has not seeded; allow nav to
      // current route so SPA renders empty/no-op (NO FRONTEND INVENTION).
      const tenantLandingRoute = entitlements.ui.tenantLandingRouteByRole?.[userRole]
        ?? entitlements.ui.tenantLandingRoute
        ?? null;

      if (!tenantLandingRoute) {
        return true;
      }

      return router.createUrlTree([tenantLandingRoute]);
    }),
    catchError(() => of(router.createUrlTree(['/auth/login'])))
  );
};
