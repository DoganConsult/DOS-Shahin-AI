// Governance-OS learning cache — in-process LRU cache layer for learning
// signals so the score-persistence service doesn't re-query dos.governance_os_learning_signals
// per inference. The persistence service consumes get / set / invalidate /
// stats. Backed by a Map with size-bounded eviction (no Redis dependency
// at this tier — that's the next service up).

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

const MAX_ENTRIES = 5_000;
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const store = new Map<string, CacheEntry<unknown>>();
let evictions = 0;

function key(tenantId: string, scope: string): string {
  return `${tenantId}::${scope}`;
}

export function get<T = unknown>(tenantId: string, scope: string): T | undefined {
  const k = key(tenantId, scope);
  const entry = store.get(k);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(k);
    return undefined;
  }
  entry.hits++;
  return entry.value as T;
}

export function set<T = unknown>(tenantId: string, scope: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  if (store.size >= MAX_ENTRIES) {
    // evict oldest entry by insertion order (Map iteration is insertion-ordered)
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) {
      store.delete(firstKey);
      evictions++;
    }
  }
  store.set(key(tenantId, scope), {
    value,
    expiresAt: Date.now() + ttlMs,
    hits: 0,
  });
}

export function invalidate(tenantId: string, scope?: string): number {
  if (scope) {
    return store.delete(key(tenantId, scope)) ? 1 : 0;
  }
  let removed = 0;
  const prefix = `${tenantId}::`;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) {
      store.delete(k);
      removed++;
    }
  }
  return removed;
}

export function stats(): { entries: number; evictions: number } {
  // sweep expired
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expiresAt < now) store.delete(k);
  }
  return { entries: store.size, evictions };
}
