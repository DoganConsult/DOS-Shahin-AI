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
import { SessionService } from '../session/session.service';

/** Request paths that should NEVER trigger auto-logout on 401 (auth flow endpoints). */
const AUTH_FLOW_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/mfa/',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/captcha',
  '/public/onboarding/new-user/register',
];

/** Page paths where 401s are expected (user may not have full auth yet). */
const ONBOARDING_PAGES = ['/register', '/onboarding', '/verify-email', '/email-verification-pending'];

/** Debounce flag to prevent multiple logout calls within the same tick. */
let _logoutInProgress = false;

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (
        err.status === 401 &&
        session.isLoggedIn() &&
        !_logoutInProgress &&
        !AUTH_FLOW_PATHS.some(p => req.url.includes(p)) &&
        !ONBOARDING_PAGES.some(p => location.pathname.startsWith(p))
      ) {
        _logoutInProgress = true;
        // Use setTimeout to batch — multiple 401s arriving in the same tick
        // will only trigger one logout redirect.
        setTimeout(() => {
          _logoutInProgress = false;
          session.logout('session_expired');
        }, 0);
      }
      return throwError(() => err);
    }),
  );
};
