"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAuditDbPort = setAuditDbPort;
exports.auditMiddleware = auditMiddleware;
exports.setAuditData = setAuditData;
exports.requestLogger = requestLogger;
exports.localKnowledgeAccessLogMiddleware = localKnowledgeAccessLogMiddleware;
const resilience_1 = require("../../resilience/resilience");
let _dbPort = null;
function setAuditDbPort(port) {
    _dbPort = port;
}
function getDb() {
    if (_dbPort)
        return _dbPort;
    try {
        // Dynamic require used intentionally for optional lazy-load of @dos/db.
        // The package may not be present in all deployment targets.
        const db = require('@dos/db');
        _dbPort = db;
        return _dbPort;
    }
    catch {
        return null;
    }
}
function auditMiddleware(actionCode) {
    return (req, res, next) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            next();
            return;
        }
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            const user = req.user;
            const tenantId = req.tenantId;
            if (user && tenantId) {
                const db = getDb();
                if (db) {
                    const schema = db.tenantSchema(tenantId);
                    db.safeQuery(`INSERT INTO "${schema}".audit_trail
             (user_id, action, entity_type, entity_id, module, path, method, ip_address, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                        user.userId || user.id,
                        actionCode || `${req.method} ${req.baseUrl}`,
                        req.params?.id ? 'record' : 'collection',
                        req.params?.id || null,
                        req.baseUrl?.split('/')[2] || null,
                        req.originalUrl,
                        req.method,
                        req.ip || null,
                        JSON.stringify({ statusCode: res.statusCode }),
                    ]).catch((0, resilience_1.catchHandler)(resilience_1.EC.DB_CLEANUP));
                }
            }
            return originalJson(body);
        };
        next();
    };
}
function setAuditData(res, data) {
    res.__auditData = data;
}
function requestLogger(..._args) {
    return (_req, _res, next) => next();
}
function localKnowledgeAccessLogMiddleware(_req, _res, next) {
    next();
}
//# sourceMappingURL=audit.js.map