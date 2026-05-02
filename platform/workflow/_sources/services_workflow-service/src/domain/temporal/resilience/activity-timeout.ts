import { logger } from '@dos/platform-core/observability';
// ============================================
// Shahin-Ai — Temporal Activity Timeout
// Wraps Temporal activities with configurable
// timeouts by activity type to prevent hung
// operations from blocking workflow progress.
//
// Requirements: W2-10
// ============================================

// ── Default Timeouts by Activity Type ──

export type ActivityType = 'db' | 'api' | 'ai' | 'general';

/** Default timeout values in milliseconds per activity type */
const DEFAULT_TIMEOUTS: Record<ActivityType, number> = {
  db: 30_000,       // Database operations: 30 seconds
  api: 60_000,      // External API calls: 60 seconds
  ai: 120_000,      // AI/LLM calls: 120 seconds
  general: 45_000,  // General operations: 45 seconds
};

// ── Timeout Error ──

export class ActivityTimeoutError extends Error {
  public readonly activityType: ActivityType;
  public readonly timeoutMs: number;

  constructor(activityName: string, activityType: ActivityType, timeoutMs: number) {
    super(`Activity "${activityName}" timed out after ${timeoutMs}ms (type: ${activityType})`);
    this.name = 'ActivityTimeoutError';
    this.activityType = activityType;
    this.timeoutMs = timeoutMs;
  }
}

// ── Timeout Wrapper ──

/**
 * Wrap an activity function with a timeout.
 * If the activity does not complete within the specified timeout,
 * it throws an ActivityTimeoutError.
 *
 * @param activityFn - The async function to wrap
 * @param timeoutMs - Timeout in milliseconds (overrides type default)
 * @param activityName - Optional name for logging
 * @returns The result of the activity function
 */
export async function withTimeout<T>(
  activityFn: () => Promise<T>,
  timeoutMs: number,
  activityName: string = 'any',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        const error = new ActivityTimeoutError(activityName, 'general', timeoutMs);
        logTimeoutEvent(activityName, 'general', timeoutMs);
        reject(error);
      }
    }, timeoutMs);

    activityFn()
      .then((result) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(result);
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
  });
}

/**
 * Create a typed activity wrapper with a pre-configured timeout
 * based on the activity type (db, api, ai, general).
 *
 * @param activityType - The type of activity for timeout selection
 * @param activityName - Name for logging and error messages
 * @param overrideTimeoutMs - Optional override for the default timeout
 * @returns A function that wraps any async operation with the configured timeout
 *
 * Usage:
 *   const dbTimeout = createTypedTimeout('db', 'fetchControls');
 *   const controls = await dbTimeout(() => query('SELECT ...'));
 */
export type DurationShorthand = `${number}m` | `${number}s`;

function parseDuration(d: DurationShorthand): number {
  const match = d.match(/^(\d+)(m|s)$/);
  if (!match) return DEFAULT_TIMEOUTS['general'];
  const [, val, unit] = match;
  return unit === 'm' ? Number(val) * 60_000 : Number(val) * 1_000;
}

export function createTypedTimeout(
  duration: DurationShorthand,
): <T>(fn: () => Promise<T>) => Promise<T>;
export function createTypedTimeout(
  activityType: ActivityType,
  activityName: string,
  overrideTimeoutMs?: number,
): <T>(fn: () => Promise<T>) => Promise<T>;
export function createTypedTimeout(
  activityTypeOrDuration: ActivityType | DurationShorthand,
  activityName?: string,
  overrideTimeoutMs?: number,
): <T>(fn: () => Promise<T>) => Promise<T> {
  let timeoutMs: number;
  let resolvedName: string;
  let resolvedType: ActivityType;

  if (!activityName && typeof activityTypeOrDuration === 'string' && /^\d+(m|s)$/.test(activityTypeOrDuration)) {
    timeoutMs = parseDuration(activityTypeOrDuration as DurationShorthand);
    resolvedName = 'activity';
    resolvedType = 'general';
  } else {
    resolvedType = activityTypeOrDuration as ActivityType;
    resolvedName = activityName ?? 'any';
    timeoutMs = overrideTimeoutMs ?? DEFAULT_TIMEOUTS[resolvedType];
  }

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          const error = new ActivityTimeoutError(resolvedName, resolvedType, timeoutMs);
          logTimeoutEvent(resolvedName, resolvedType, timeoutMs);
          reject(error);
        }
      }, timeoutMs);

      fn()
        .then((result) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(result);
          }
        })
        .catch((err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  };
}

/**
 * Get the default timeout for an activity type.
 */
export function getDefaultTimeout(activityType: ActivityType): number {
  return DEFAULT_TIMEOUTS[activityType];
}

// ── Internal Logging ──

function logTimeoutEvent(activityName: string, activityType: ActivityType, timeoutMs: number): void {
  logger.warn(
    JSON.stringify({
      level: 'warn',
      component: 'activity-timeout',
      activityName,
      activityType,
      timeoutMs,
      message: `Activity "${activityName}" timed out after ${timeoutMs}ms`,
      timestamp: new Date().toISOString(),
    }),
  );
}
