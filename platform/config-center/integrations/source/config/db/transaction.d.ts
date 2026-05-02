import { PoolClient } from 'pg';
export declare function withTransaction<T>(tenantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T>;
export declare function withTransactionIsolation<T>(tenantId: string, isolationLevel: 'SERIALIZABLE' | 'REPEATABLE READ' | 'READ COMMITTED' | 'READ UNCOMMITTED', fn: (client: PoolClient) => Promise<T>): Promise<T>;
