export declare const CacheTTL: {
    readonly LOOKUP: 3600;
    readonly SESSION: 300;
    readonly AGENT_RESULT: 1800;
    readonly DASHBOARD: 120;
    readonly USER_PROFILE: 600;
    readonly FRAMEWORK: 3600;
    readonly SHORT: 60;
    readonly MEDIUM: 600;
    readonly LONG: 86400;
};
export declare const CacheNS: {
    readonly LOOKUP: "lkp:";
    readonly SESSION: "sess:";
    readonly AGENT: "agent:";
    readonly DASHBOARD: "dash:";
    readonly USER: "usr:";
    readonly FRAMEWORK: "fw:";
    readonly TENANT: "tnt:";
    readonly RATE: "rate:";
    readonly COMPLIANCE: "compliance:";
    readonly NAVIGATION: "nav:";
};
/**
 * Get a cached value. Returns parsed JSON or null.
 */
export declare function cacheGet<T = any>(key: string): Promise<T | null>;
/**
 * Set a cached value with TTL (seconds).
 */
export declare function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
/**
 * Delete a specific key.
 */
export declare function cacheDel(key: string): Promise<void>;
/**
 * Delete all keys matching a pattern (e.g. "lkp:*" to clear all lookups).
 * Uses SCAN to avoid blocking Redis.
 */
export declare function cacheInvalidatePattern(pattern: string): Promise<number>;
/**
 * Invalidate all keys in a namespace.
 */
export declare function cacheInvalidateNamespace(ns: string): Promise<number>;
/**
 * Invalidate compliance cache for a tenant (overview, frameworks, etc.).
 * Call after compliance writes: gap/remediation/finding/control/evidence/framework/assessment updates.
 */
export declare function invalidateComplianceCache(tenantId: string): Promise<number>;
/**
 * Get-or-set pattern: returns cached value or calls fetcher, caches result.
 */
export declare function cacheGetOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T>;
/**
 * Get-or-set with metadata: returns { data, fromCache } for observability.
 */
export declare function cacheGetOrSetWithMeta<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<{
    data: T;
    fromCache: boolean;
}>;
/**
 * Flush the entire cache (admin operation).
 */
export declare function cacheFlushAll(): Promise<void>;
/**
 * Get cache stats for monitoring.
 */
export declare function cacheStats(): Promise<{
    backend: 'redis' | 'memory';
    memoryKeys: number;
    redisInfo?: {
        keys: number;
        usedMemory: string;
        hitRate: string;
    };
}>;
