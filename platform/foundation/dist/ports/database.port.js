"use strict";
/**
 * Database port — outbound interface for SQL access.
 * Host wires a real Postgres adapter (e.g. @dos/db); defaults throw so the
 * module fails-closed when unbound.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTenantClient = exports.tenantSchema = exports.getFirstRow = exports.query = exports.safeQuery = exports.getPool = exports.getClient = void 0;
exports.bindDatabasePort = bindDatabasePort;
const unbound = (name) => async () => {
    throw new Error(`[foundation] database port not bound: call bindDatabasePort() before using ${name}`);
};
let _getClient = unbound('getClient');
let _getPool = () => {
    throw new Error('[foundation] database port not bound: call bindDatabasePort() before using getPool');
};
let _safeQuery = unbound('safeQuery');
let _query = unbound('query');
let _getFirstRow = (result) => result?.rows && result.rows.length > 0 ? result.rows[0] : null;
let _tenantSchema = (tenantId) => `tenant_${tenantId}`;
let _withTenantClient = (async () => {
    throw new Error('[foundation] database port not bound: call bindDatabasePort() before using withTenantClient');
});
function bindDatabasePort(impl) {
    if (impl.getClient)
        _getClient = impl.getClient;
    if (impl.getPool)
        _getPool = impl.getPool;
    if (impl.safeQuery)
        _safeQuery = impl.safeQuery;
    if (impl.query)
        _query = impl.query;
    else if (impl.safeQuery)
        _query = impl.safeQuery;
    if (impl.getFirstRow)
        _getFirstRow = impl.getFirstRow;
    if (impl.tenantSchema)
        _tenantSchema = impl.tenantSchema;
    if (impl.withTenantClient)
        _withTenantClient = impl.withTenantClient;
}
const getClient = () => _getClient();
exports.getClient = getClient;
const getPool = () => _getPool();
exports.getPool = getPool;
const safeQuery = (sql, params) => _safeQuery(sql, params);
exports.safeQuery = safeQuery;
const query = (sql, params) => _query(sql, params);
exports.query = query;
const getFirstRow = (result) => _getFirstRow(result);
exports.getFirstRow = getFirstRow;
const tenantSchema = (id) => _tenantSchema(id);
exports.tenantSchema = tenantSchema;
const withTenantClient = (id, fn) => _withTenantClient(id, fn);
exports.withTenantClient = withTenantClient;
//# sourceMappingURL=database.port.js.map