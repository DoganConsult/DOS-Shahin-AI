import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GrcAuthService } from '../../services/grc-auth.service';
import { StorageService } from '@app/infrastructure';
import { PostAuthOrchestratorService } from '../../../dauth/session/post-auth-orchestrator.service';
import { SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS } from '../../services/platform/app-bootstrap.service';

/** Extra slack beyond HTTP timeout for resolveEntryRoute (profile / sync work inside orchestrator). */
const LANDING_GUARD_ROUTE_RESOLVE_SLACK_MS = 5_000;

export const landingGuard: CanActivateFn = async () => {
  const authService = inject(GrcAuthService);
  const router = inject(Router);
  const storage = inject(StorageService);
  const orchestrator = inject(PostAuthOrchestratorService);

  if (!authService.isLoggedIn()) {
    return true;
  }

  const resolveMs = SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS + LANDING_GUARD_ROUTE_RESOLVE_SLACK_MS;
  const route = await Promise.race([
    orchestrator.resolveEntryRoute(),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error(`[landingGuard] resolveEntryRoute exceeded ${resolveMs}ms`)), resolveMs),
    ),
  ]).catch(err => {
    console.warn(err);
    // No fallback - empty route means router will handle empty navigation
    return '';
  });

  if (!route) {
    // No landing page configured - router will handle empty navigation
    return true;
  }

  const tenantId = authService.tenantId() || '';
  const cockpitKey = tenantId ? `grc_cockpit_shown_${tenantId}` : 'grc_cockpit_shown';
  if (!storage.get(cockpitKey)) {
    storage.set(cockpitKey, 'true');
  }

  router.navigateByUrl(route);
  return false;
};
