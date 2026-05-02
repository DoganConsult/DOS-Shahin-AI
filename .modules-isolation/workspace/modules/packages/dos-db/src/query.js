"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDbMetricsHook = setDbMetricsHook;
exports.emptyResult = emptyResult;
exports.query = query;
exports.safeQuery = safeQuery;
exports.safeQueryWithClient = safeQueryWithClient;
exports.getClient = getClient;
exports.withClient = withClient;
exports.withPoolClient = withPoolClient;
const pool_1 = require("./pool");
const logger_1 = require("./logger");
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500', 10);
// Metrics hook — set by platform bootstrap to record DB query durations
let _metricsHook = null;
function setDbMetricsHook(hook) {
    _metricsHook = hook;
}
function classifyOperation(sql) {
    const trimmed = sql.trimStart().toUpperCase();
    if (trimmed.startsWith('SELECT'))
        return 'select';
    if (trimmed.startsWith('INSERT'))
        return 'insert';
    if (trimmed.startsWith('UPDATE'))
        return 'update';
    if (trimmed.startsWith('DELETE'))
        return 'delete';
    if (trimmed.startsWith('CREATE'))
        return 'ddl';
    if (trimmed.startsWith('ALTER'))
        return 'ddl';
    if (trimmed.startsWith('DROP'))
        return 'ddl';
    return 'other';
}
function emptyQueryResult() {
    return {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
    };
}
function emptyResult(rows = []) {
    return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] };
}
async function query(text, params) {
    if (globalThis.__globalMockQuery)
        return globalThis.__globalMockQuery(text, params);
    const logger = (0, logger_1.getDbLogger)();
    const p = (0, pool_1.getPool)();
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
    }
    catch (err) {
        const duration = Date.now() - start;
        _metricsHook?.(op, duration, true);
        if (duration > SLOW_QUERY_THRESHOLD_MS) {
            logger.warn(`[SLOW_QUERY_FAILED] ${duration}ms: ${text.slice(0, 200)}`);
        }
        throw err;
    }
}
async function safeQuery(text, params) {
    if (globalThis.__globalMockSafeQuery)
        return globalThis.__globalMockSafeQuery(text, params);
    const logger = (0, logger_1.getDbLogger)();
    const p = (0, pool_1.getPool)();
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
    }
    catch (err) {
        const duration = Date.now() - start;
        _metricsHook?.(op, duration, true);
        const pgCode = err['code'];
        if (duration > SLOW_QUERY_THRESHOLD_MS) {
            logger.warn(`[SLOW_QUERY_FAILED] ${duration}ms: ${text.slice(0, 200)}`);
        }
        if (pgCode === '42P01') {
            logger.warn(`[SAFE_QUERY_STRUCTURAL] relation does not exist — query: ${text.slice(0, 200)}`);
            return emptyQueryResult();
        }
        if (pgCode === '42703') {
            logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] column does not exist — query: ${text.slice(0, 200)} — error: ${err.message}`);
            return emptyQueryResult();
        }
        if (pgCode === '3F000') {
            logger.warn(`[SAFE_QUERY_STRUCTURAL] schema does not exist — query: ${text.slice(0, 200)}`);
            return emptyQueryResult();
        }
        if (pgCode === '42883') {
            logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] undefined function — query: ${text.slice(0, 200)} — error: ${err.message}`);
            return emptyQueryResult();
        }
        throw err;
    }
}
async function safeQueryWithClient(text, params, client) {
    if (globalThis.__globalMockSafeQuery)
        return globalThis.__globalMockSafeQuery(text, params);
    const logger = (0, logger_1.getDbLogger)();
    const p = (0, pool_1.getPool)();
    const queryFn = client ? client.query.bind(client) : p.query.bind(p);
    const start = Date.now();
    try {
        const result = await queryFn(text, params);
        const duration = Date.now() - start;
        if (duration > SLOW_QUERY_THRESHOLD_MS) {
            logger.warn(`[SLOW_QUERY] ${duration}ms: ${text.slice(0, 200)}`);
        }
        return result;
    }
    catch (err) {
        const duration = Date.now() - start;
        const pgCode = err['code'];
        if (duration > SLOW_QUERY_THRESHOLD_MS) {
            logger.warn(`[SLOW_QUERY_FAILED] ${duration}ms: ${text.slice(0, 200)}`);
        }
        if (pgCode === '42P01') {
            logger.warn(`[SAFE_QUERY_STRUCTURAL] relation does not exist — query: ${text.slice(0, 200)}`);
            return emptyQueryResult();
        }
        if (pgCode === '42703') {
            logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] column does not exist — query: ${text.slice(0, 200)} — error: ${err.message}`);
            return emptyQueryResult();
        }
        if (pgCode === '3F000') {
            logger.warn(`[SAFE_QUERY_STRUCTURAL] schema does not exist — query: ${text.slice(0, 200)}`);
            return emptyQueryResult();
        }
        if (pgCode === '42883') {
            logger.error(`[SAFE_QUERY_SCHEMA_DRIFT] undefined function — query: ${text.slice(0, 200)} — error: ${err.message}`);
            return emptyQueryResult();
        }
        throw err;
    }
}
async function getClient() {
    return (0, pool_1.getPool)().connect();
}
async function withClient(fn) {
    const client = await (0, pool_1.getPool)().connect();
    try {
        return await fn(client);
    }
    finally {
        client.release();
    }
}
async function withPoolClient(customPool, fn) {
    const client = await customPool.connect();
    try {
        return await fn(client);
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=query.js.map