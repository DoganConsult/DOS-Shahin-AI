import { Pool } from 'pg';
import { getPlatformConnectionConfig, buildSslFromConfig } from './config';
import { getDbLogger } from './logger';

const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500', 10);

let _pool: Pool | null = null;

function createPool(): Pool {
  const dbConfig = getPlatformConnectionConfig();
  const logger = getDbLogger();

  // Tag every backend with the PM2 process name so DBAs can see which service
  // is holding which connection in pg_stat_activity. Falls back to the
  // node-pg default when SERVICE_CODE/PM2 metadata isn't available.
  const appName = process.env.SERVICE_CODE
    || process.env.PM2_INSTANCE_ID && process.env.name
    || process.env.npm_package_name
    || 'dos-platform';

  const p = new Pool({
    ...(dbConfig.connectionString
      ? { connectionString: dbConfig.connectionString }
      : {
          host: dbConfig.host || undefined,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          password: dbConfig.password,
        }),
    max: dbConfig.pool.max,
    idleTimeoutMillis: dbConfig.pool.idleTimeoutMillis,
    connectionTimeoutMillis: dbConfig.pool.connectionTimeoutMillis,
    statement_timeout: dbConfig.pool.statementTimeoutMs,
    ssl: buildSslFromConfig(dbConfig.ssl),
    application_name: appName,
  });

  p.on('connect', (client) => {
    const originalQuery = client.query.bind(client);
    (client as unknown as Record<string, unknown>).query = function (...args: unknown[]) {
      const start = Date.now();
      const result = (originalQuery as (...a: unknown[]) => unknown)(...args);
      if (result && typeof (result as Record<string, unknown>).then === 'function') {
        (result as Promise<unknown>).then(() => {
          const duration = Date.now() - start;
          if (duration >= SLOW_QUERY_THRESHOLD_MS) {
            const queryText = typeof args[0] === 'string' ? args[0].slice(0, 200) : 'any';
            logger.warn({ durationMs: duration, query: queryText }, 'Slow query detected');
          }
        }).catch(() => { /* slow-query timing — non-critical */ });
      }
      return result;
    };
  });

  p.on('error', (err) => {
    logger.error({ error: (err instanceof Error ? err.message : String(err)) }, 'Unexpected idle client error');
  });

  return p;
}

export function getPool(): Pool {
  if (!_pool) {
    _pool = createPool();
  }
  return _pool;
}

export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    return Reflect.get(getPool(), prop, receiver);
  },
});

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

export interface ServicePoolConfig {
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statementTimeoutMs?: number;
}

const _servicePools = new Map<string, Pool>();

export function createServicePool(serviceCode: string, config: ServicePoolConfig = {}): Pool {
  const existing = _servicePools.get(serviceCode);
  if (existing) return existing;

  const dbConfig = getPlatformConnectionConfig();
  const logger = getDbLogger();
  const connectionString = config.connectionString || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(`[DB] No DATABASE_URL configured for ${serviceCode}`);
  }

  const p = new Pool({
    connectionString,
    max: config.max ?? 10,
    idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
    connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5000,
    statement_timeout: config.statementTimeoutMs ?? 30000,
    ssl: buildSslFromConfig(dbConfig.ssl),
    application_name: serviceCode,
  });

  p.on('connect', (client) => {
    const originalQuery = client.query.bind(client);
    (client as unknown as Record<string, unknown>).query = function (...args: unknown[]) {
      const start = Date.now();
      const result = (originalQuery as (...a: unknown[]) => unknown)(...args);
      if (result && typeof (result as Record<string, unknown>).then === 'function') {
        (result as Promise<unknown>).then(() => {
          const duration = Date.now() - start;
          if (duration >= SLOW_QUERY_THRESHOLD_MS) {
            const queryText = typeof args[0] === 'string' ? args[0].slice(0, 200) : 'any';
            logger.warn({ durationMs: duration, query: queryText, service: serviceCode }, 'Slow query detected');
          }
        }).catch(() => {});
      }
      return result;
    };
  });

  p.on('error', (err) => {
    logger.error({ error: (err instanceof Error ? err.message : String(err)), service: serviceCode }, 'Unexpected idle client error');
  });

  _servicePools.set(serviceCode, p);
  return p;
}

export async function closeServicePool(serviceCode: string): Promise<void> {
  const p = _servicePools.get(serviceCode);
  if (p) {
    await p.end();
    _servicePools.delete(serviceCode);
  }
}

export async function closeAllServicePools(): Promise<void> {
  for (const [code, p] of _servicePools) {
    await p.end();
    _servicePools.delete(code);
  }
}
