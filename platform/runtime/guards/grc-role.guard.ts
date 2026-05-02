import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { GrcAuthService } from '../../core/services/grc-auth.service';
import { normalizePermission } from '@app/runtime/utils/permission-normalizer';

export const grcRoleGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const authService = inject(GrcAuthService);
  const router = inject(Router);
  const requiredPermission = route.data['requiredPermission'] as string;
  const requiredFunction = route.data['requiredFunction'] as string | undefined;

  if (requiredPermission) {
    // Normalize permission format (dot → colon) for migration safety
    const normalizedPerm = normalizePermission(requiredPermission);
    if (!authService.hasPermission(normalizedPerm)) {
      router.navigate(['/workspace-home']);
      return false;
    }
  }

  if (requiredFunction) {
    const hasFunction = await authService.hasFunction(requiredFunction);
    if (!hasFunction) {
      router.navigate(['/workspace-home']);
      return false;
    }
  }

  if (!requiredPermission && !requiredFunction && (globalThis as Record<string, unknown>).ngDevMode) {
    console.warn(`[grcRoleGuard] Route "${route.routeConfig?.path}" has no requiredPermission — relying on backend enforcement`);
  }
  return true;
};
