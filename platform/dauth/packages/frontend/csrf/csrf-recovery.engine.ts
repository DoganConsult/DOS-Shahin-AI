import { OperationProfile } from './operation-metadata';
import { SessionHealthState } from './session-health.service';

/**
 * Recovery strategies — ordered from least to most disruptive.
 *
 *   retry-silent    → refresh token and retry, user sees nothing
 *   retry-notify    → refresh and retry, show brief info toast
 *   prompt-reauth   → session irrecoverable, redirect to login
 *   surface-error   → show error, let user decide (bulk/privileged ops)
 *   block           → session too degraded, force logout
 */
export type RecoveryStrategy =
  | 'retry-silent'
  | 'retry-notify'
  | 'prompt-reauth'
  | 'surface-error'
  | 'block';

/**
 * Backend security hint codes — returned in the CSRF 403 response body.
 * These let the frontend make more informed recovery decisions.
 */
export type BackendSecurityHint =
  | 'refresh_allowed'
  | 'replay_unsafe'
  | 'reauth_required'
  | 'manual_resubmit'
  | 'grace_window_accepted'
  | 'session_too_old';

export interface CsrfFailureContext {
  errorCode: string;
  backendHint?: BackendSecurityHint;
  operationProfile: OperationProfile;
  sessionHealth: SessionHealthState;
  sessionScore: number;
  hasClockDrift: boolean;
}

/**
 * Determine the recovery strategy for a CSRF failure.
 *
 * Combines operation semantics, session health, and backend hints
 * into a single decision — the intelligence layer.
 */
export function resolveRecoveryStrategy(ctx: CsrfFailureContext): RecoveryStrategy {
  // ── Backend gave explicit guidance — respect it ──
  if (ctx.backendHint) {
    switch (ctx.backendHint) {
      case 'reauth_required':
      case 'session_too_old':
        return 'prompt-reauth';
      case 'replay_unsafe':
      case 'manual_resubmit':
        return 'surface-error';
      case 'refresh_allowed':
        return ctx.operationProfile.autoRetryAllowed ? 'retry-silent' : 'surface-error';
      case 'grace_window_accepted':
        return 'retry-silent';
    }
  }

  // ── Session is expired or severely degraded — no retry ──
  if (ctx.sessionHealth === 'expired') return 'block';
  if (ctx.sessionHealth === 'degraded') return 'prompt-reauth';

  // ── Operation forbids replay (privileged actions) ──
  if (ctx.operationProfile.replayRisk === 'forbidden') return 'surface-error';

  // ── Bulk/async — replay is unsafe regardless of session health ──
  if (ctx.operationProfile.replayRisk === 'unsafe') return 'surface-error';

  // ── Session is unstable — be cautious ──
  if (ctx.sessionHealth === 'unstable') {
    return ctx.operationProfile.replayRisk === 'safe' ? 'retry-notify' : 'surface-error';
  }

  // ── Clock drift detected — notify user even for safe retries ──
  if (ctx.hasClockDrift) {
    return ctx.operationProfile.autoRetryAllowed ? 'retry-notify' : 'surface-error';
  }

  // ── Healthy session + retryable operation → silent or notify ──
  if (ctx.operationProfile.autoRetryAllowed) {
    return ctx.operationProfile.replayRisk === 'safe' ? 'retry-silent' : 'retry-notify';
  }

  return 'surface-error';
}

/**
 * User-facing i18n key for the recovery outcome.
 * Maps to security.csrf.* keys in en.json / ar.json.
 */
export function getRecoveryMessageKey(strategy: RecoveryStrategy, ctx: CsrfFailureContext): string {
  switch (strategy) {
    case 'retry-silent':
      return 'security.csrf.retried_silently';
    case 'retry-notify':
      if (ctx.hasClockDrift) return 'security.csrf.retried_clock_drift';
      if (ctx.sessionHealth === 'unstable') return 'security.csrf.retried_unstable_session';
      return 'security.csrf.retried_token_rotated';
    case 'prompt-reauth':
      if (ctx.errorCode === 'CSRF_TOKEN_EXPIRED') return 'security.csrf.session_too_old';
      return 'security.csrf.session_degraded';
    case 'surface-error':
      if (ctx.operationProfile.semantic === 'bulk') return 'security.csrf.bulk_not_retried';
      if (ctx.operationProfile.semantic === 'privileged') return 'security.csrf.privileged_not_retried';
      if (ctx.operationProfile.semantic === 'async-triggering') return 'security.csrf.async_not_retried';
      return 'security.csrf.operation_not_retried';
    case 'block':
      return 'security.csrf.session_blocked';
  }
}
