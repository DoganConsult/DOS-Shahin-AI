import { HttpErrorResponse } from '@angular/common/http';

const DEFAULT_RETRY_AFTER_SECONDS = 30;

function toPositiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : null;
}

/**
 * Parse the retry-after duration from a 429 response.
 * Priority: body.retryAfterSeconds > Retry-After header > default (30s).
 * Returns seconds as a number.
 */
export function parseRetryAfterSeconds(error: HttpErrorResponse): number {
  const bodySeconds = toPositiveInt(error.error?.retryAfterSeconds);
  if (bodySeconds) return bodySeconds;

  const headerValue = error.headers?.get('Retry-After');
  const headerSeconds = toPositiveInt(headerValue);
  if (headerSeconds) return headerSeconds;

  return DEFAULT_RETRY_AFTER_SECONDS;
}
