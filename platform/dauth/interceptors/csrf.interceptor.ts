import { HttpInterceptorFn } from '@angular/common/http';

const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (CSRF_METHODS.has(req.method)) {
    const token = getCsrfToken();
    if (token) {
      return next(req.clone({ setHeaders: { 'X-XSRF-TOKEN': token } }));
    }
  }
  return next(req);
};
