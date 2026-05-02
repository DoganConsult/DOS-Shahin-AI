import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError, throwError, tap, EMPTY } from 'rxjs';
import { CsrfTokenService } from '../csrf/csrf-token.service';
import { SessionHealthService } from '../csrf/session-health.service';
import { SessionService } from '../session/session.service';
import { classifyOperation } from '../csrf/operation-metadata';
import {
  resolveRecoveryStrategy,
  getRecoveryMessageKey,
  type BackendSecurityHint,
  type CsrfFailureContext,
} from '../csrf/csrf-recovery.engine';
import { DAUTH_TOAST_PORT, DAUTH_I18N_PORT } from '../ports';

const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Enterprise CSRF interceptor — intelligence-driven.
 *
 * Instead of hardcoded path lists, every request is classified by
 * operation semantics (idempotent, bulk, privileged, pre-auth, etc.)
 * and recovery decisions are scored against session health state.
 *
 * Flow:
 *   1. classifyOperation → OperationProfile (semantic, replay risk)
 *   2. Skip if !csrfRequired (pre-auth, public)
 *   3. Wait for token bootstrap if not ready
 *   4. Attach X-XSRF-TOKEN header
 *   5. On 403: build CsrfFailureContext → resolveRecoveryStrategy
 *   6. Execute strategy (retry-silent, retry-notify, prompt-reauth, surface-error, block)
 */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!CSRF_METHODS.has(req.method)) {
    return next(req);
  }

  // ── Classify by operation semantics ──
  const profile = classifyOperation(req.method, req.url);

  if (!profile.csrfRequired) {
    return next(req);
  }

  const csrfService = inject(CsrfTokenService);
  const sessionHealth = inject(SessionHealthService);
  const session = inject(SessionService);
  const toast = inject(DAUTH_TOAST_PORT);
  const i18n = inject(DAUTH_I18N_PORT);

  const attachAndSend = (token: string | null) => {
    const outgoing = token
      ? req.clone({ setHeaders: { 'X-XSRF-TOKEN': token } })
      : req;
    return next(outgoing);
  };

  const handleCsrfError = (err: HttpErrorResponse) => {
    if (
      err.status !== 403 ||
      (err.error?.code !== 'CSRF_INVALID' && err.error?.code !== 'CSRF_TOKEN_EXPIRED')
    ) {
      return throwError(() => err);
    }

    // ── Record failure for health tracking ──
    sessionHealth.recordCsrfFailure();

    // ── Build context for recovery engine ──
    const ctx: CsrfFailureContext = {
      errorCode: err.error.code,
      backendHint: err.error.hint as BackendSecurityHint | undefined,
      operationProfile: profile,
      sessionHealth: sessionHealth.state(),
      sessionScore: sessionHealth.score(),
      hasClockDrift: sessionHealth.clockDrift() !== null,
    };

    const strategy = resolveRecoveryStrategy(ctx);
    const messageKey = getRecoveryMessageKey(strategy, ctx);

    switch (strategy) {
      case 'retry-silent':
        return from(csrfService.refresh()).pipe(
          switchMap(freshToken => attachAndSend(freshToken)),
        );

      case 'retry-notify':
        return from(csrfService.refresh()).pipe(
          switchMap(freshToken => attachAndSend(freshToken)),
          tap(() => {
            toast.info(
              i18n.t('security.csrf.retried_token_rotated'),
              i18n.t(messageKey),
            );
          }),
        );

      case 'prompt-reauth':
        toast.warn(
          i18n.t('security.csrf.session_degraded'),
          i18n.t(messageKey),
        );
        session.logout('csrf_session_degraded');
        return EMPTY;

      case 'block':
        session.logout('csrf_session_blocked');
        return EMPTY;

      case 'surface-error':
      default:
        toast.error(
          i18n.t('security.csrf.operation_not_retried'),
          i18n.t(messageKey),
        );
        return throwError(() => err);
    }
  };

  const sendWithRecovery = (token: string | null) =>
    attachAndSend(token).pipe(catchError(handleCsrfError));

  // ── Wait for bootstrap if not ready ──
  if (!csrfService.isReady()) {
    return from(csrfService.waitUntilReady()).pipe(
      switchMap(() => sendWithRecovery(csrfService.token())),
    );
  }

  return sendWithRecovery(csrfService.token());
};
