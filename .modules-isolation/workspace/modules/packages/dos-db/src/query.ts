import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { getPool } from './pool';
import { getDbLogger } from './logger';

const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500', 10);

// Metrics hook — set by platform bootstrap to record DB query durations
let _metricsHook: ((operation: string, durationMs: number, error?: boolean) => void) | null = null;
export function setDbMetricsHook(hook: (operation: string, durationMs: number, error?: boolean) => void): void {
  _metricsHook = hook;
}

function classifyOperation(sql: string): string {
  const trimmed = sql.trimStart().toUpperCase();
  if (trimmed.startsWith('SELECT')) return 'select';
  if (trimmed.startsWith('INSERT')) return 'insert';
  if (trimmed.startsWith('UPDATE')) return 'update';
  if (trimmed.startsWith('DELETE')) return 'delete';
  if (trimmed.startsWith('CREATE')) return 'ddl';
  if (trimmed.startsWith('ALTER')) return 'ddl';
  if (trimmed.startsWith('DROP')) return 'ddl';
  return 'other';
}

function emptyQueryResult<R extends QueryResultRow = any>(): QueryResult<R> {
  return {
    rows: [],
    rowCount: 0,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

export function emptyResult<T extends Record<string, unknown> = Record<string, unknown>>(rows: T[] = []): QueryResult<T> {
  return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] };
}

export async function query<R extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<QueryResult<R>> {
  if ((globalThis as any).__globalMockQuery) return (globalThis as any).__globalMockQuery(text, params);
  const logger = getDbLogger();
  const p = getPool();
  const start = Date.now();
  const op = classifyOperation(text);
  try {
    const result = await p.query(text, params);
    const duration = Date.now() - start;
    _metricsHook?.(op, duration);
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY] ${duration}ms: ${text.slice(0, 200)}`);
    }
    return result;
  } catch (err: unknown) {
    const duration = Date.now() - start;
    _metricsHook?.(op, duration, true);
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY_FAILED] ${duration}ms: ${text.slice(0, 200)}`);
    }
    throw err;
  }
}

export async function safeQuery<R extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<QueryResult<R>> {
  if ((globalThis as any).__globalMockSafeQuery) return (globalThis as any).__globalMockSafeQuery(text, params);
  const logger = getDbLogger();
  const p = getPool();
  const start = Date.now();
  const op = classifyOperation(text);
  try {
    const result = await p.query(text, params);
    const duration = Date.now() - start;
    _metricsHook?.(op, duration);
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY] ${duration}ms: ${text.slice(0, 200)}`);
    }
    return result;
  } catch (err: unknown) {
    const duration = Date.now() - start;
    _metricsHook?.(op, duration, true);
    const pgCode = (err as Record<string, unknown>)['code'];
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY_FAILED] ${duration}ms: ${text.slice(0, 200)}`);
    }
    if (pgCode === '42P01') {
      logger.warn(`[SAFE_QUERY_STRUCTURAL] relation does not exist — query: ${text.slice(0, 200)}`);
      return emptyQueryResult();
    }
    if (pgCode === '42703') {
      logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] column does not exist — query: ${text.slice(0, 200)} — error: ${(err as Error).message}`);
      return emptyQueryResult();
    }
    if (pgCode === '3F000') {
      logger.warn(`[SAFE_QUERY_STRUCTURAL] schema does not exist — query: ${text.slice(0, 200)}`);
      return emptyQueryResult();
    }
    if (pgCode === '42883') {
      logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] undefined function — query: ${text.slice(0, 200)} — error: ${(err as Error).message}`);
      return emptyQueryResult();
    }
    throw err;
  }
}

export async function safeQueryWithClient<R extends QueryResultRow = any>(
  text: string,
  params?: unknown[],
  client?: PoolClient,
): Promise<QueryResult<R>> {
  if ((globalThis as any).__globalMockSafeQuery) return (globalThis as any).__globalMockSafeQuery(text, params);
  const logger = getDbLogger();
  const p = getPool();
  const queryFn = client ? client.query.bind(client) : p.query.bind(p);
  const start = Date.now();
  try {
    const result = await queryFn(text, params);
    const duration = Date.now() - start;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY] ${duration}ms: ${text.slice(0, 200)}`);
    }
    return result;
  } catch (err: unknown) {
    const duration = Date.now() - start;
    const pgCode = (err as Record<string, unknown>)['code'];
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[SLOW_QUERY_FAILED] ${duration}ms: ${text.slice(0, 200)}`);
    }
    if (pgCode === '42P01') {
      logger.warn(`[SAFE_QUERY_STRUCTURAL] relation does not exist — query: ${text.slice(0, 200)}`);
      return emptyQueryResult();
    }
    if (pgCode === '42703') {
      logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] column does not exist — query: ${text.slice(0, 200)} — error: ${(err as Error).message}`);
      return emptyQueryResult();
    }
    if (pgCode === '3F000') {
      logger.warn(`[SAFE_QUERY_STRUCTURAL] schema does not exist — query: ${text.slice(0, 200)}`);
      return emptyQueryResult();
    }
    if (pgCode === '42883') {
      logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] undefined function — query: ${text.slice(0, 200)} — error: ${(err as Error).message}`);
      return emptyQueryResult();
    }
    throw err;
  }
}

export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function withPoolClient<T>(customPool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await customPool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
