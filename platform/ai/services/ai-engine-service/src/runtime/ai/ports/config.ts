import { readFileSync } from 'fs';
import { getLogger as getDbLogger } from './logger';

const isProduction = process.env.NODE_ENV === 'production';

const LEGACY_KEYS = ['PG_HOST', 'PG_PORT', 'PG_DATABASE', 'PG_USER', 'PG_PASSWORD'] as const;

export interface PlatformDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionString?: string;
  ssl: { caPath?: string; rejectUnauthorized: boolean };
  pool: {
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    statementTimeoutMs: number;
  };
}

function parseConnectionString(url: string): Partial<PlatformDbConfig> {
  try {
    const u = new URL(url);
    if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') {
      throw new Error('DATABASE_URL must be postgresql:// or postgres://');
    }
    return {
      host: u.hostname || '',
      port: u.port ? parseInt(u.port, 10) : 5432,
      database: u.pathname ? u.pathname.replace(/^\//, '') : '',
      user: u.username || '',
      password: u.password || '',
      connectionString: url,
    };
  } catch (e) {
    throw new Error(`Invalid DATABASE_URL: ${(e as Error).message}`);
  }
}

function readFromPgEnv(): Partial<PlatformDbConfig> {
  const host = process.env.PG_HOST;
  const port = process.env.PG_PORT;
  const database = process.env.PG_DATABASE;
  const user = process.env.PG_USER;
  const password = process.env.PG_PASSWORD;

  if (isProduction) {
    const missing: string[] = [];
    if (!host) missing.push('PG_HOST');
    if (!database) missing.push('PG_DATABASE');
    if (!user) missing.push('PG_USER');
    if (!password) missing.push('PG_PASSWORD');
    if (missing.length > 0) {
      throw new Error(
        `Platform DB config missing in production: ${missing.join(', ')}. Set these or use DATABASE_URL.`
      );
    }
  }

  return {
    host: host || (isProduction ? '' : 'localhost'),
    port: port ? parseInt(port, 10) : 5432,
    database: database || (isProduction ? '' : 'platform_db'),
    user: user || (isProduction ? '' : 'platform'),
    password: password || (isProduction ? '' : ''),
  };
}

let cached: PlatformDbConfig | null = null;

export function getPlatformConnectionConfig(): PlatformDbConfig {
  if (cached) return cached;

  const logger = getDbLogger();
  const url = process.env.DATABASE_URL;
  const hasPg = LEGACY_KEYS.some((k) => process.env[k]);

  if (url && hasPg) {
    logger.warn('[platform-db.config] Both DATABASE_URL and PG_* are set; using DATABASE_URL. Prefer a single source.');
  }

  let base: Partial<PlatformDbConfig>;
  if (url && url.trim() !== '') {
    base = parseConnectionString(url.trim());
    if (isProduction && (!base.database || !base.user || !base.password)) {
      throw new Error('DATABASE_URL must include database, user, and password in production.');
    }
  } else {
    base = readFromPgEnv();
  }

  const sslCaPath = process.env.PG_SSL_CA;
  const sslExplicit = process.env.PG_SSL === 'true';
  const isLocal =
    !base.host ||
    ['localhost', '127.0.0.1', '::1'].includes(String(base.host).toLowerCase());

  let sslRejectUnauthorized: boolean;
  if (isLocal) {
    sslRejectUnauthorized = false;
  } else if (isProduction) {
    if (sslExplicit && !sslCaPath) {
      throw new Error(
        '[platform-db.config] FATAL: PG_SSL=true on remote host in production but PG_SSL_CA is not set. ' +
        'Cannot verify database server identity without a CA certificate. ' +
        'Set PG_SSL_CA to the path of your PostgreSQL server CA certificate, or set PG_SSL=false for unencrypted (NOT recommended).'
      );
    }
    sslRejectUnauthorized = !!sslCaPath;
  } else {
    if (sslExplicit && !sslCaPath) {
      logger.warn('[platform-db.config] PG_SSL=true but PG_SSL_CA is not set on remote host. Connection will use TLS without certificate verification (INSECURE). Set PG_SSL_CA for verified TLS.');
    }
    sslRejectUnauthorized = !!sslCaPath;
  }

  const config: PlatformDbConfig = {
    host: base.host ?? 'localhost',
    port: base.port ?? 5432,
    database: base.database ?? 'platform_db',
    user: base.user ?? 'platform',
    password: base.password ?? '',
    connectionString: base.connectionString,
    ssl: {
      caPath: sslCaPath || undefined,
      rejectUnauthorized: sslRejectUnauthorized,
    },
    pool: {
      max: parseInt(process.env.PG_POOL_MAX || '20', 10),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(
        process.env.PG_CONNECTION_TIMEOUT_MS || '5000',
        10
      ),
      statementTimeoutMs: parseInt(
        process.env.PG_STATEMENT_TIMEOUT_MS || '30000',
        10
      ),
    },
  };

  if (isProduction) {
    logger.info(`[platform-db.config] Resolved: provider=postgres host=${config.host} port=${config.port} database=${config.database} user=${config.user}`);
  }

  cached = config;
  return config;
}

export function getConnectionString(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return process.env.DATABASE_URL.trim();
  }
  const c = getPlatformConnectionConfig();
  const proto = c.ssl.caPath || (!['localhost', '127.0.0.1'].includes(c.host))
    ? 'postgresql'
    : 'postgres';
  const enc = encodeURIComponent;
  return `${proto}://${enc(c.user)}:${enc(c.password)}@${c.host}:${c.port}/${enc(c.database)}`;
}

export function resetPlatformDbConfigCache(): void {
  cached = null;
}

export function buildSslFromConfig(ssl: { caPath?: string; rejectUnauthorized: boolean }): { rejectUnauthorized: boolean; ca?: string } | undefined {
  const sslExplicit = process.env.PG_SSL === 'true';
  if (ssl.caPath) {
    try {
      return { rejectUnauthorized: true, ca: readFileSync(ssl.caPath, 'utf8') };
    } catch { /* fall through to basic SSL */ }
  }
  if (ssl.rejectUnauthorized) {
    return { rejectUnauthorized: true };
  }
  if (sslExplicit) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export function buildPgSslConfig(): { rejectUnauthorized: boolean; ca?: string } | false {
  if ((process.env.DB_SSL || process.env.PG_SSL) !== 'true') return false;

  const logger = getDbLogger();
  const caPath = process.env.DB_SSL_CA || process.env.PG_SSL_CA;
  if (caPath) {
    try {
      return { rejectUnauthorized: true, ca: readFileSync(caPath, 'utf8') };
    } catch (err) {
      throw new Error(
        `[ssl-config] FATAL: DB_SSL_CA is set to "${caPath}" but the file cannot be read. ` +
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const host = process.env.DB_HOST || process.env.PG_HOST || 'localhost';
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase());

  if (isProduction && !isLocal) {
    throw new Error(
      '[ssl-config] FATAL: DB_SSL=true on remote host in production but DB_SSL_CA is not set. ' +
      'Set DB_SSL_CA to the path of your PostgreSQL server CA certificate.'
    );
  }

  if (isProduction && isLocal) {
    logger.warn(
      '[ssl-config] WARNING: DB_SSL=true on localhost without CA cert. ' +
      'Using rejectUnauthorized=false for same-host connection. ' +
      'This is acceptable only when Postgres is on the same machine.'
    );
  }

  return { rejectUnauthorized: false };
}
