/**
 * correlation-id.interceptor — §B.9 item #40 + the data feed for item #25.
 *
 * Passive HTTP interceptor that:
 *   1. Reads `x-request-id` / `x-correlation-id` from every response
 *      (success AND error) and stores it in ShellErrorStateService.
 *   2. On failure responses maps the HTTP status to a DosShellErrorKind
 *      and pushes a structured error into the same service so the shell
 *      error frame can render it.
 *   3. Explicitly does NOT toast, log, or mutate the request — other
 *      interceptors (GlobalErrorHandler, auth refresh) keep their jobs.
 *
 * Install in the host app via:
 *   provideHttpClient(withInterceptors([correlationIdInterceptor]))
 */
import { inject } from '@angular/core';
import {
  HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse, HttpErrorResponse,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ShellErrorStateService } from './shell-error-state.service';

const CORR_HEADERS = ['x-request-id', 'x-correlation-id', 'x-trace-id'] as const;

function extractCorrelationId(headers: { get(name: string): string | null }): string | null {
  for (const h of CORR_HEADERS) {
    const v = headers.get(h);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export const correlationIdInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const errState = inject(ShellErrorStateService);

  return next(req).pipe(
    tap({
      next: (evt) => {
        if (evt instanceof HttpResponse) {
          errState.setCorrelationId(extractCorrelationId(evt.headers));
        }
      },
      error: (err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) return;
        errState.setCorrelationId(extractCorrelationId(err.headers));
        const kind = ShellErrorStateService.kindForStatus(err.status);
        if (!kind) return;
        // Skip 401 refresh attempts — let auth interceptor handle them.
        // Skip 404 on GETs that explicitly opt out via header.
        if (req.headers.has('x-shell-silent')) return;
        errState.setError({
          kind,
          status: err.status,
          message: err.message || err.statusText || `HTTP ${err.status}`,
          correlationId: extractCorrelationId(err.headers),
          url: err.url ?? req.urlWithParams,
          at: new Date().toISOString(),
        });
      },
    }),
  );
};
