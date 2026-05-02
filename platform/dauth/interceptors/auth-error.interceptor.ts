/**
 * DAuth Auth-Error Interceptor — catches 401 responses and auto-logouts.
 *
 * When the backend returns 401 (expired/invalid/missing token), this interceptor
 * clears the stale session and redirects to /login with a reason flag so the login
 * page can show "Session expired — please sign in again."
 *
 * Law 11: Deny by default — if auth fails, redirect; don't render broken UI.
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { GrcAuthService } from '../../core/services/grc-auth.service';

/** Request paths that should NEVER trigger auto-logout on 401 (auth flow endpoints). */
const AUTH_FLOW_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/oidc/session',
  '/auth/oidc/refresh',
  '/auth/oidc/logout',
  '/access/my-permissions',
  '/auth/mfa/',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/captcha',
  '/onboarding/register',
  '/public/onboarding/register',
];

/**
 * Endpoints whose 401 is downstream-service-specific (per-route authz, RBAC,
 * or service-internal token mismatch) rather than a genuine session expiry.
 * A 401 from these paths must NOT auto-logout the user — the page should
 * render an empty/forbidden state instead. Without this list the SPA enters
 * a login → workspace-home → 401 → logout → login loop because workspace-home
 * fans out parallel calls and any single 401 kills the session.
 */
const NON_SESSION_401_PATHS = [
  '/api/kpi/',
  '/api/connector-health',
  '/api/nudges/',
  '/api/ai-os/',
  '/api/ai-engine/',
  '/api/ai-enhanced/',
  '/api/module-kickstart-status',
  '/api/foundation/',
  '/api/users',
  '/api/teams',
  '/api/roles',
  '/api/departments',
  '/api/organizations',
  '/api/business-units',
  '/api/positions',
  '/api/locations',
  '/api/committees',
  '/api/invitations',
  '/api/audit-trail',
  '/api/profiles',
  '/api/notifications',
  '/api/dashboard-widgets',
  '/api/analytics',
  '/api/integrations',
  '/api/dynamic-ui/',
  '/api/config-center',
  '/api/config/',
  '/api/navigation/',
  '/api/tenant-home',
  '/api/tenants',
];

/** Page paths where 401s are expected (user may not have full auth yet). */
const ONBOARDING_PAGES = ['/register', '/onboarding', '/verify-email', '/email-verification-pending'];

/** Debounce flag to prevent multiple logout calls within the same tick. */
let _logoutInProgress = false;

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(GrcAuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (
        err.status === 401 &&
        auth.isLoggedIn() &&
        !_logoutInProgress &&
        !AUTH_FLOW_PATHS.some(p => req.url.includes(p)) &&
        !NON_SESSION_401_PATHS.some(p => req.url.includes(p)) &&
        !ONBOARDING_PAGES.some(p => location.pathname.startsWith(p))
      ) {
        _logoutInProgress = true;
        // Use setTimeout to batch — multiple 401s arriving in the same tick
        // will only trigger one logout redirect.
        setTimeout(() => {
          _logoutInProgress = false;
          auth.logout('session_expired');
        }, 0);
      }
      return throwError(() => err);
    }),
  );
};
