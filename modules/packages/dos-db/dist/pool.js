"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.getPool = getPool;
exports.closePool = closePool;
exports.createServicePool = createServicePool;
exports.closeServicePool = closeServicePool;
exports.closeAllServicePools = closeAllServicePools;
const pg_1 = require("pg");
const config_1 = require("./config");
const logger_1 = require("./logger");
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500', 10);
let _pool = null;
function createPool() {
    const dbConfig = (0, config_1.getPlatformConnectionConfig)();
    const logger = (0, logger_1.getDbLogger)();
    // Tag every backend with the PM2 process name so DBAs can see which service
    // is holding which connection in pg_stat_activity. Falls back to the
    // node-pg default when SERVICE_CODE/PM2 metadata isn't available.
    const appName = process.env.SERVICE_CODE
        || process.env.PM2_INSTANCE_ID && process.env.name
        || process.env.npm_package_name
        || 'dos-platform';
    const p = new pg_1.Pool({
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
        ssl: (0, config_1.buildSslFromConfig)(dbConfig.ssl),
        application_name: appName,
    });
    p.on('connect', (client) => {
        const originalQuery = client.query.bind(client);
        client.query = function (...args) {
            const start = Date.now();
            const result = originalQuery(...args);
            if (result && typeof result.then === 'function') {
                result.then(() => {
                    const duration = Date.now() - start;
                    if (duration >= SLOW_QUERY_THRESHOLD_MS) {
                        const queryText = typeof args[0] === 'string' ? args[0].slice(0, 200) : 'any';
                        logger.warn({ durationMs: duration, query: queryText }, 'Slow query detected');
                    }
                }).catch(() => { });
            }
            return result;
        };
    });
    p.on('error', (err) => {
        logger.error({ error: (err instanceof Error ? err.message : String(err)) }, 'Unexpected idle client error');
    });
    return p;
}
function getPool() {
    if (!_pool) {
        _pool = createPool();
    }
    return _pool;
}
exports.pool = new Proxy({}, {
    get(_target, prop, receiver) {
        return Reflect.get(getPool(), prop, receiver);
    },
});
async function closePool() {
    if (_pool) {
        await _pool.end();
        _pool = null;
    }
}
const _servicePools = new Map();
function createServicePool(serviceCode, config = {}) {
    const existing = _servicePools.get(serviceCode);
    if (existing)
        return existing;
    const dbConfig = (0, config_1.getPlatformConnectionConfig)();
    const logger = (0, logger_1.getDbLogger)();
    const connectionString = config.connectionString || process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error(`[DB] No DATABASE_URL configured for ${serviceCode}`);
    }
    const p = new pg_1.Pool({
        connectionString,
        max: config.max ?? 10,
        idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
        connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5000,
        statement_timeout: config.statementTimeoutMs ?? 30000,
        ssl: (0, config_1.buildSslFromConfig)(dbConfig.ssl),
        application_name: serviceCode,
    });
    p.on('connect', (client) => {
        const originalQuery = client.query.bind(client);
        client.query = function (...args) {
            const start = Date.now();
            const result = originalQuery(...args);
            if (result && typeof result.then === 'function') {
                result.then(() => {
                    const duration = Date.now() - start;
                    if (duration >= SLOW_QUERY_THRESHOLD_MS) {
                        const queryText = typeof args[0] === 'string' ? args[0].slice(0, 200) : 'any';
                        logger.warn({ durationMs: duration, query: queryText, service: serviceCode }, 'Slow query detected');
                    }
                }).catch(() => { });
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
async function closeServicePool(serviceCode) {
    const p = _servicePools.get(serviceCode);
    if (p) {
        await p.end();
        _servicePools.delete(serviceCode);
    }
}
async function closeAllServicePools() {
    for (const [code, p] of _servicePools) {
        await p.end();
        _servicePools.delete(code);
    }
}
//# sourceMappingURL=pool.js.map