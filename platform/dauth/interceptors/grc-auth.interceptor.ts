import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Auth interceptor — single source of truth = httpOnly `dos_access_token`
 * cookie set by auth-service on the OIDC callback. The SPA never reads the
 * token; instead every request opts into credentials so the browser attaches
 * the cookie on same-origin /api/* calls.
 *
 * Anything that tries to inject `Authorization: Bearer …` from browser
 * storage MUST stay removed — that path was the source of split-brain auth.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isPublic = req.url.includes('/api/public/') || req.url.includes('/api/public?');
  if (isPublic) return next(req);
  if (req.withCredentials) return next(req);
  return next(req.clone({ withCredentials: true }));
};

/** @deprecated Use authInterceptor — kept for legacy DI tokens. */
export const grcAuthInterceptor = authInterceptor;
