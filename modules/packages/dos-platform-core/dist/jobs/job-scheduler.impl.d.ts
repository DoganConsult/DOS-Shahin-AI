import type { PlatformJobs } from './jobs';
declare let _loggerFn: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
};
export declare function configureJobScheduler(opts: {
    query: (sql: string, params?: unknown[]) => Promise<{
        rows: any[];
        rowCount?: number;
    }>;
    getRedis?: () => any;
    redisConnected?: () => boolean;
    logger?: typeof _loggerFn;
}): void;
export declare function createJobSchedulerImpl(): PlatformJobs;
export declare function getProvisionedTenants(): Promise<Array<{
    tenant_id: string;
    settings?: any;
}>>;
export {};
