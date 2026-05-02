"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setModuleUserContext = setModuleUserContext;
exports.getModuleContextRegistry = getModuleContextRegistry;
exports.getModuleUserContext = getModuleUserContext;
exports.getAllUserModuleContexts = getAllUserModuleContexts;
const db_1 = require("@dos/db");
const _registry = new Map();
function contextKey(tenantId, userId, moduleCode) {
    return `${tenantId}:${userId}:${moduleCode}`;
}
async function setModuleUserContext(tenantId, userId, moduleCode, context) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".module_user_contexts
       (user_id, module_code, preferences, state, last_accessed_at)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, NOW())
     ON CONFLICT (user_id, module_code) DO UPDATE
       SET preferences = COALESCE(EXCLUDED.preferences, module_user_contexts.preferences),
           state = COALESCE(EXCLUDED.state, module_user_contexts.state),
           last_accessed_at = NOW(),
           updated_at = NOW()
     RETURNING *`, [userId, moduleCode, JSON.stringify(context.preferences ?? {}), JSON.stringify(context.state ?? {})]);
    const row = rows[0] ?? {};
    const ctx = {
        userId,
        moduleCode,
        tenantId,
        preferences: row['preferences'] ?? context.preferences ?? {},
        state: row['state'] ?? context.state ?? {},
        lastAccessedAt: row['last_accessed_at'] != null ? String(row['last_accessed_at']) : null,
        updatedAt: String(row['updated_at'] ?? new Date().toISOString()),
    };
    _registry.set(contextKey(tenantId, userId, moduleCode), ctx);
    return ctx;
}
function getModuleContextRegistry() {
    return new Map(_registry);
}
async function getModuleUserContext(tenantId, userId, moduleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".module_user_contexts
     WHERE user_id = $1 AND module_code = $2
     LIMIT 1`, [userId, moduleCode]);
    if (!rows[0])
        return null;
    const row = rows[0];
    return {
        userId,
        moduleCode,
        tenantId,
        preferences: row['preferences'] ?? {},
        state: row['state'] ?? {},
        lastAccessedAt: row['last_accessed_at'] != null ? String(row['last_accessed_at']) : null,
        updatedAt: String(row['updated_at'] ?? ''),
    };
}
async function getAllUserModuleContexts(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".module_user_contexts WHERE user_id = $1 ORDER BY module_code`, [userId]);
    return rows.map(row => ({
        userId,
        moduleCode: String(row['module_code']),
        tenantId,
        preferences: row['preferences'] ?? {},
        state: row['state'] ?? {},
        lastAccessedAt: row['last_accessed_at'] != null ? String(row['last_accessed_at']) : null,
        updatedAt: String(row['updated_at'] ?? ''),
    }));
}
//# sourceMappingURL=module-user-context.service.js.map