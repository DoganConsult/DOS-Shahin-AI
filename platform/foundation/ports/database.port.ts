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
export type WithTenantClientFn = <T>(
  tenantId: string,
  fn: (client: DbClient) => Promise<T>,
) => Promise<T>;

const unbound = (name: string) => async () => {
  throw new Error(`[foundation] database port not bound: call bindDatabasePort() before using ${name}`);
};

let _getClient: GetClientFn = unbound('getClient') as GetClientFn;
let _getPool: GetPoolFn = () => {
  throw new Error('[foundation] database port not bound: call bindDatabasePort() before using getPool');
};
let _safeQuery: SafeQueryFn = unbound('safeQuery') as SafeQueryFn;
let _query: QueryFn = unbound('query') as QueryFn;
let _getFirstRow: GetFirstRowFn = <T>(result: QueryResult<T>) =>
  result?.rows && result.rows.length > 0 ? result.rows[0] : null;
let _tenantSchema: TenantSchemaFn = (tenantId) => `tenant_${tenantId}`;
let _withTenantClient: WithTenantClientFn = (async () => {
  throw new Error('[foundation] database port not bound: call bindDatabasePort() before using withTenantClient');
}) as WithTenantClientFn;

export function bindDatabasePort(impl: {
  getClient?: GetClientFn;
  getPool?: GetPoolFn;
  safeQuery?: SafeQueryFn;
  query?: QueryFn;
  getFirstRow?: GetFirstRowFn;
  tenantSchema?: TenantSchemaFn;
  withTenantClient?: WithTenantClientFn;
}) {
  if (impl.getClient) _getClient = impl.getClient;
  if (impl.getPool) _getPool = impl.getPool;
  if (impl.safeQuery) _safeQuery = impl.safeQuery;
  if (impl.query) _query = impl.query;
  else if (impl.safeQuery) _query = impl.safeQuery;
  if (impl.getFirstRow) _getFirstRow = impl.getFirstRow;
  if (impl.tenantSchema) _tenantSchema = impl.tenantSchema;
  if (impl.withTenantClient) _withTenantClient = impl.withTenantClient;
}

export const getClient: GetClientFn = () => _getClient();
export const getPool: GetPoolFn = () => _getPool();
export const safeQuery: SafeQueryFn = (sql, params) => _safeQuery(sql, params);
export const query: QueryFn = (sql, params) => _query(sql, params);
export const getFirstRow: GetFirstRowFn = (result) => _getFirstRow(result);
export const tenantSchema: TenantSchemaFn = (id) => _tenantSchema(id);
export const withTenantClient: WithTenantClientFn = (id, fn) => _withTenantClient(id, fn);
