import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Cookie-session interceptor.
 *
 * Browser auth truth is the HTTP-only cookie issued by the auth-service.
 * The interceptor never reads tokens from storage and never sets an
 * Authorization: Bearer header. It only opts every request into
 * `withCredentials: true` so the cookie travels with same-origin and
 * cross-origin (when allowed) requests.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.withCredentials) return next(req);
  return next(req.clone({ withCredentials: true }));
};

/** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Use authInterceptor — will be removed in Phase 9. */
export const grcAuthInterceptor = authInterceptor;
