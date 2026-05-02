"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moduleStack = moduleStack;
exports.setModuleStackDbPort = setModuleStackDbPort;
exports.blockInHumanOnlyMode = blockInHumanOnlyMode;
exports.requireHybridOrHigher = requireHybridOrHigher;
exports.i18nMiddleware = i18nMiddleware;
exports.apiVersionMiddleware = apiVersionMiddleware;
function moduleStack(moduleCode) {
    return (req, _res, next) => {
        req.moduleCode = moduleCode;
        req.module = moduleCode;
        next();
    };
}
let _dbPort = null;
function setModuleStackDbPort(port) { _dbPort = port; }
function getDb() {
    if (_dbPort)
        return _dbPort;
    try {
        _dbPort = require('@dos/db');
        return _dbPort;
    }
    catch {
        return null;
    }
}
function blockInHumanOnlyMode() {
    return async (req, res, next) => {
        const tenantId = req.tenantId;
        if (!tenantId) {
            next();
            return;
        }
        try {
            const db = getDb();
            if (!db) {
                next();
                return;
            }
            const { rows } = await db.safeQuery(`SELECT setting_value FROM public.tenant_settings WHERE tenant_id = $1 AND setting_key = 'platform_mode' LIMIT 1`, [tenantId]);
            const mode = rows[0]?.setting_value ?? 'hybrid';
            if (mode === 'human') {
                res.status(403).json({ error: 'AI actions blocked: tenant is in human-only mode' });
                return;
            }
        }
        catch { /* allow through */ }
        next();
    };
}
function requireHybridOrHigher() {
    return async (req, res, next) => {
        const tenantId = req.tenantId;
        if (!tenantId) {
            next();
            return;
        }
        try {
            const db = getDb();
            if (!db) {
                next();
                return;
            }
            const { rows } = await db.safeQuery(`SELECT setting_value FROM public.tenant_settings WHERE tenant_id = $1 AND setting_key = 'platform_mode' LIMIT 1`, [tenantId]);
            const mode = rows[0]?.setting_value ?? 'hybrid';
            if (mode === 'human') {
                res.status(403).json({ error: 'Requires hybrid or higher AI mode — current: human-only' });
                return;
            }
        }
        catch { /* allow through */ }
        next();
    };
}
function i18nMiddleware() {
    return (req, _res, next) => {
        const acceptLang = req.headers['accept-language'] || '';
        req.lang = acceptLang.startsWith('ar') ? 'ar' : 'en';
        next();
    };
}
function apiVersionMiddleware(req, res, next) {
    res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
    next();
}
//# sourceMappingURL=module-stack.js.map