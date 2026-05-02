import Redis from 'ioredis';
export declare function getRedis(): Redis;
export declare function getRedisSubscriber(): Redis;
export declare function connectRedis(): Promise<boolean>;
export declare function isRedisHealthy(): Promise<{
    connected: boolean;
    latencyMs: number;
}>;
export declare function redisConnected(): boolean;
export declare function disconnectRedis(): Promise<void>;
