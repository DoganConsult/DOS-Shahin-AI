/**
 * Database port — outbound interface for SQL access.
 * Host wires a real Postgres adapter (e.g. @dos/db); defaults throw so the
 * module fails-closed when unbound.
 */
export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
}
export type QueryResultRow = Record<string, any>;
export interface DbClient {
    query<T = any>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    release?(): void;
}
export interface DbPool {
    query<T = any>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    connect?(): Promise<DbClient>;
    end?(): Promise<void>;
}
export type GetClientFn = () => Promise<DbClient>;
export type GetPoolFn = () => DbPool;
export type SafeQueryFn = <T = any>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>;
export type QueryFn = SafeQueryFn;
export type GetFirstRowFn = <T = any>(result: QueryResult<T>) => T | null;
export type TenantSchemaFn = (tenantId: string) => string;
export type WithTenantClientFn = <T>(tenantId: string, fn: (client: DbClient) => Promise<T>) => Promise<T>;
export declare function bindDatabasePort(impl: {
    getClient?: GetClientFn;
    getPool?: GetPoolFn;
    safeQuery?: SafeQueryFn;
    query?: QueryFn;
    getFirstRow?: GetFirstRowFn;
    tenantSchema?: TenantSchemaFn;
    withTenantClient?: WithTenantClientFn;
}): void;
export declare const getClient: GetClientFn;
export declare const getPool: GetPoolFn;
export declare const safeQuery: SafeQueryFn;
export declare const query: QueryFn;
export declare const getFirstRow: GetFirstRowFn;
export declare const tenantSchema: TenantSchemaFn;
export declare const withTenantClient: WithTenantClientFn;
