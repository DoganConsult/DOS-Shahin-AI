// Sentry init shared across every service. Wired at the top of
// createServiceServer so it captures ALL subsequent errors. Uses GlitchTip
// (Sentry-protocol-compatible) running natively on :8000 by default.
//
// Configure via env:
//   SENTRY_DSN              — full DSN. If unset, init is a no-op.
//   SENTRY_ENV              — defaults to NODE_ENV.
//   SENTRY_RELEASE          — defaults to GIT_SHA or APP_VERSION.
//   SENTRY_TRACES_SAMPLE    — 0..1, defaults 0.05 (5%).
//   SENTRY_PROFILES_SAMPLE  — 0..1, defaults 0.

import * as Sentry from '@sentry/node';

let _initialized = false;

export interface ErrorTelemetryOptions {
  serviceCode: string;
  /** Override DSN (otherwise read from SENTRY_DSN). */
  dsn?: string;
}

export function initErrorTelemetry(opts: ErrorTelemetryOptions): boolean {
  if (_initialized) return true;
  const dsn = opts.dsn ?? process.env.SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? process.env.GIT_SHA ?? process.env.APP_VERSION,
    serverName: opts.serviceCode,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE ?? '0.05'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE ?? '0'),
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip tokens from breadcrumbs and request payloads — defense in depth
      // even though pino redact already handles structured logs.
      if (event.request?.headers) {
        for (const k of ['authorization', 'cookie', 'x-service-token']) {
          if (event.request.headers[k]) event.request.headers[k] = '[REDACTED]';
        }
      }
      return event;
    },
  });

  _initialized = true;
  return true;
}

export function captureException(err: unknown, ctx?: Record<string, unknown>): void {
  if (!_initialized) return;
  Sentry.captureException(err, ctx ? { extra: ctx } : undefined);
}

export function captureMessage(msg: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info'): void {
  if (!_initialized) return;
  Sentry.captureMessage(msg, level);
}

export const sentry = Sentry;
