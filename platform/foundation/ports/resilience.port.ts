/**
 * Resilience port — outbound interface for error/retry handling.
 * Mirrors `@dos/platform-core/resilience` (catchHandler, EC) but bindable.
 */

export const EC = {
  EVENT_BUS: 'event_bus',
  DB: 'database',
  HTTP: 'http',
  AI: 'ai',
  WORKFLOW: 'workflow',
  AUDIT: 'audit',
  UNKNOWN: 'unknown',
} as const;
export type ErrorCategory = (typeof EC)[keyof typeof EC];

export type CatchHandlerFn = (
  category: ErrorCategory | string,
  context?: Record<string, unknown>,
) => (err: unknown) => void;

let _catchHandler: CatchHandlerFn = (category) => (err) => {
  // Default: log and swallow so callers stay non-blocking. Host can override.
  // eslint-disable-next-line no-console
  console.warn(`[foundation:${category}]`, err instanceof Error ? err.message : String(err));
};

export function bindResiliencePort(impl: { catchHandler?: CatchHandlerFn }) {
  if (impl.catchHandler) _catchHandler = impl.catchHandler;
}

export const catchHandler: CatchHandlerFn = (cat, ctx) => _catchHandler(cat, ctx);
