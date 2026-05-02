"use strict";
// Batch processor — runs a per-item async function over a collection
// with bounded concurrency, retry-with-backoff per item, and an
// aggregated error report. Used by governance-os-knowledge-publisher to
// fan out per-tenant publish jobs without overwhelming downstream services.
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchProcessor = void 0;
exports.processBatch = processBatch;
async function withRetry(fn, retries, delayMs) {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await fn();
        }
        catch (err) {
            attempt++;
            if (attempt > retries)
                throw err;
            await new Promise((r) => setTimeout(r, delayMs * attempt));
        }
    }
}
async function processBatch(items, worker, opts = {}) {
    const concurrency = Math.max(1, opts.concurrency ?? 5);
    const retries = Math.max(0, opts.retries ?? 0);
    const retryDelayMs = Math.max(0, opts.retryDelayMs ?? 250);
    const start = Date.now();
    const successes = [];
    const failures = [];
    let cursor = 0;
    async function next() {
        while (true) {
            const idx = cursor++;
            if (idx >= items.length)
                return;
            const item = items[idx];
            try {
                const result = await withRetry(() => worker(item, idx), retries, retryDelayMs);
                successes.push({ item, result, index: idx });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                failures.push({ item, error: msg, index: idx });
                opts.onItemError?.(err, item, idx);
            }
        }
    }
    const runners = [];
    for (let i = 0; i < concurrency; i++)
        runners.push(next());
    await Promise.all(runners);
    return { successes, failures, totalMs: Date.now() - start };
}
exports.batchProcessor = { processBatch };
exports.default = exports.batchProcessor;
