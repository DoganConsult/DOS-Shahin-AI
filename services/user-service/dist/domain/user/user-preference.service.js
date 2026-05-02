"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPreferences = getUserPreferences;
exports.getModulePreferences = getModulePreferences;
exports.setUserPreferences = setUserPreferences;
const db_1 = require("@dos/db");
async function getUserPreferences(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT preferences FROM "${schema}".user_preferences
     WHERE user_id = $1 AND module_code IS NULL
     LIMIT 1`, [userId]);
    return rows[0]?.['preferences'] ?? {};
}
async function getModulePreferences(tenantId, userId, moduleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT preferences FROM "${schema}".user_preferences
     WHERE user_id = $1 AND module_code = $2
     LIMIT 1`, [userId, moduleCode]);
    return rows[0]?.['preferences'] ?? {};
}
async function setUserPreferences(tenantId, userId, preferences, moduleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_preferences
       (user_id, module_code, preferences)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id, COALESCE(module_code, '__global__')) DO UPDATE
       SET preferences = "${schema}".user_preferences.preferences || EXCLUDED.preferences,
           updated_at = NOW()
     RETURNING *`, [userId, moduleCode ?? null, JSON.stringify(preferences)]);
    const row = rows[0] ?? {};
    return {
        userId,
        tenantId,
        moduleCode: moduleCode ?? null,
        preferences: row['preferences'] ?? preferences,
        updatedAt: String(row['updated_at'] ?? new Date().toISOString()),
    };
}
//# sourceMappingURL=user-preference.service.js.map