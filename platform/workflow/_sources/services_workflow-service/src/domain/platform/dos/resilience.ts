export enum ErrorCategory {
  EVENT_BUS = 'EVENT_BUS',
  AGENT_ACTION = 'AGENT_ACTION',
  DB_CLEANUP = 'DB_CLEANUP',
  CACHE_OP = 'CACHE_OP',
  FALLBACK_QUERY = 'FALLBACK_QUERY',
}

export const EC = ErrorCategory;

export interface CatchContext {
  tenantId?: string;
  correlationId?: string;
  agentId?: string;
  operation?: string;
  userId?: string;
}

export interface PlatformResilience {
  swallow(category: ErrorCategory, promise: Promise<unknown>, context?: CatchContext): void;
  swallowNull<T>(category: ErrorCategory, promise: Promise<T>, context?: CatchContext): Promise<T | null>;
  swallowEmpty<T>(category: ErrorCategory, promise: Promise<T[]>, context?: CatchContext): Promise<T[]>;
  swallowDefault<T>(category: ErrorCategory, fallback: T, promise: Promise<T>, context?: CatchContext): Promise<T>;
  swallowSync(category: ErrorCategory, fn: () => void, context?: CatchContext): void;
  catchHandler(category: ErrorCategory, context?: CatchContext): (err: unknown) => void;
}

let _resilience: PlatformResilience | null = null;

export function setResilienceHandler(impl: PlatformResilience): void {
  _resilience = impl;
}

function getResilience(): PlatformResilience {
  if (!_resilience) {
    // Return a dummy implementation before initialization to avoid breaking early startups
    return {
      swallow: (cat, p) => { p.catch(() => {}); },
      swallowNull: async (cat, p) => p.catch(() => null),
      swallowEmpty: async (cat, p) => p.catch(() => []),
      swallowDefault: async (cat, fallback, p) => p.catch(() => fallback),
      swallowSync: (cat, fn) => { try { fn(); } catch {} },
      catchHandler: () => () => {},
    };
  }
  return _resilience;
}

export function swallow(category: ErrorCategory, promise: Promise<unknown>, context?: CatchContext): void {
  return getResilience().swallow(category, promise, context);
}

export function swallowNull<T>(category: ErrorCategory, promise: Promise<T>, context?: CatchContext): Promise<T | null> {
  return getResilience().swallowNull(category, promise, context);
}

export function swallowEmpty<T>(category: ErrorCategory, promise: Promise<T[]>, context?: CatchContext): Promise<T[]> {
  return getResilience().swallowEmpty(category, promise, context);
}

export function swallowDefault<T>(category: ErrorCategory, fallback: T, promise: Promise<T>, context?: CatchContext): Promise<T> {
  return getResilience().swallowDefault(category, fallback, promise, context);
}

export function swallowSync(category: ErrorCategory, fn: () => void, context?: CatchContext): void {
  return getResilience().swallowSync(category, fn, context);
}

export function catchHandler(category: ErrorCategory, context?: CatchContext): (err: unknown) => void {
  return getResilience().catchHandler(category, context);
}

export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
