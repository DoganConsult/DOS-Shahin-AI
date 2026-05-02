import type { Router as RouterType } from 'express';
export declare function createHealthRouter(serviceCode: string, checks?: Record<string, () => Promise<boolean>>): RouterType;
export declare function dbHealthCheck(): Promise<boolean>;
export declare function redisHealthCheck(): Promise<boolean>;
export declare function eventBusHealthCheck(): Promise<boolean>;
//# sourceMappingURL=health.d.ts.map