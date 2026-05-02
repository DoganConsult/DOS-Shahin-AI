import Redis from 'ioredis';
export declare function getRedis(): Redis;
export declare function getRedisSubscriber(): Redis;
export declare function connectRedis(): Promise<boolean>;
export declare function isRedisHealthy(): Promise<{
    connected: boolean;
    latencyMs: number;
}>;
export declare function redisConnected(): boolean;
export declare function tenantCacheKey(tenantId: string, key: string): string;
export declare function tenantUserCacheKey(tenantId: string, userId: string, key: string): string;
export declare function disconnectRedis(): Promise<void>;
