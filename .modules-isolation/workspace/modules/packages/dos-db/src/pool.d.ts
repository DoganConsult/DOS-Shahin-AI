import { Pool } from 'pg';
export declare function getPool(): Pool;
export declare const pool: Pool;
export declare function closePool(): Promise<void>;
export interface ServicePoolConfig {
    connectionString?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    statementTimeoutMs?: number;
}
export declare function createServicePool(serviceCode: string, config?: ServicePoolConfig): Pool;
export declare function closeServicePool(serviceCode: string): Promise<void>;
export declare function closeAllServicePools(): Promise<void>;
