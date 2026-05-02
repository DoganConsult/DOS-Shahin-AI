export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (err: unknown) => boolean;
}

export function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  if (
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('connection terminated') ||
    msg.includes('too many clients') ||
    msg.includes('deadlock') ||
    msg.includes('lock timeout') ||
    msg.includes('could not connect')
  ) {
    return true;
  }
  const anyErr = err as Record<string, unknown>;
  const code = anyErr['code'];
  if (typeof code === 'string' && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(code)) {
    return true;
  }
  const status = anyErr['statusCode'] ?? anyErr['status'];
  if (typeof status === 'number' && (status === 429 || status === 503 || status === 502 || status === 504)) {
    return true;
  }
  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 200,
    maxDelayMs = 10_000,
    backoffFactor = 2,
    shouldRetry = isRetryableError,
  } = options;

  let lastErr: unknown;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !shouldRetry(err)) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * delay * 0.2);
      await sleep(Math.min(delay + jitter, maxDelayMs));
      delay = Math.min(delay * backoffFactor, maxDelayMs);
    }
  }

  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
