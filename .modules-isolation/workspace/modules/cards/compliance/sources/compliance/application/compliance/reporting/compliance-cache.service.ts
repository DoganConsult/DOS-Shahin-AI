import { safeQuery } from "@dos/db";

/**
 * In-memory short-TTL cache for compliance overview and frameworks list.
 * Keys: compliance:overview:{tenantId}, compliance:frameworks:{tenantId}
 * TTL from getComplianceSettings(tenantId).cacheTtlSeconds (0 = no cache).
 */

const store = new Map<string, { value: unknown; expiresAt: number }>();

function key(prefix: string, tenantId: string): string {
  return `compliance:${prefix}:${tenantId}`;
}

export function get<T>(prefix: string, tenantId: string): T | undefined {
  const k = key(prefix, tenantId);
  const entry = store.get(k);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(k);
    return undefined;
  }
  return entry.value as T;
}

export function set(prefix: string, tenantId: string, value: unknown, ttlSeconds: number): void {
  if (ttlSeconds <= 0) return;
  const k = key(prefix, tenantId);
  store.set(k, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function invalidate(tenantId: string): void {
  const overviewKey = key("overview", tenantId);
  const frameworksKey = key("frameworks", tenantId);
  store.delete(overviewKey);
  store.delete(frameworksKey);
}
