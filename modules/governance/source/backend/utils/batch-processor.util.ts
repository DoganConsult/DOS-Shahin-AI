// Batch processor — runs a per-item async function over a collection
// with bounded concurrency, retry-with-backoff per item, and an
// aggregated error report. Used by governance-os-knowledge-publisher to
// fan out per-tenant publish jobs without overwhelming downstream services.

export interface BatchOptions {
  concurrency?: number;
  retries?: number;
  retryDelayMs?: number;
  onItemError?: (err: unknown, item: unknown, index: number) => void;
}

export interface BatchResult<T, R> {
  successes: Array<{ item: T; result: R; index: number }>;
  failures: Array<{ item: T; error: string; index: number }>;
  totalMs: number;
}

async function withRetry<T>(fn: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try { return await fn(); }
    catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
}

export async function processBatch<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  opts: BatchOptions = {},
): Promise<BatchResult<T, R>> {
  const concurrency = Math.max(1, opts.concurrency ?? 5);
  const retries = Math.max(0, opts.retries ?? 0);
  const retryDelayMs = Math.max(0, opts.retryDelayMs ?? 250);
  const start = Date.now();

  const successes: BatchResult<T, R>['successes'] = [];
  const failures: BatchResult<T, R>['failures'] = [];

  let cursor = 0;
  async function next(): Promise<void> {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      const item = items[idx];
      try {
        const result = await withRetry(() => worker(item, idx), retries, retryDelayMs);
        successes.push({ item, result, index: idx });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push({ item, error: msg, index: idx });
        opts.onItemError?.(err, item, idx);
      }
    }
  }

  const runners: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) runners.push(next());
  await Promise.all(runners);

  return { successes, failures, totalMs: Date.now() - start };
}

export const batchProcessor = { processBatch };
export default batchProcessor;
