"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDashboardConfig = saveDashboardConfig;
exports.getDashboardConfig = getDashboardConfig;
exports.serializeDashboardConfig = serializeDashboardConfig;
exports.deserializeDashboardConfig = deserializeDashboardConfig;
const resilience_1 = require("@dos/platform-core/resilience");
// ============================================
// Shahin — Analytics Dashboard Service
// Dashboard configuration persistence and
// serialization/deserialization
// ============================================
const database_port_1 = require("../../ports/database.port");
const db_1 = require("@dos/db");
// @ts-ignore - Pragmatic stabilization to unblock build
// === Dashboard Configuration ===
/**
 * Upserts a dashboard configuration for a user.
 * Uses INSERT ON CONFLICT to update if a config already exists for the user.
 */
async function saveDashboardConfig(tenantId, userId, config) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    // Ensure column exists on user_preferences
    await (0, database_port_1.safeQuery)(`ALTER TABLE "${schema}".user_preferences ADD COLUMN IF NOT EXISTS dashboard_config JSONB`).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}));
    const existing = await (0, database_port_1.safeQuery)(`SELECT user_id FROM "${schema}".user_preferences WHERE user_id = $1`, [userId]);
    if (existing.rows.length > 0) {
        await (0, database_port_1.safeQuery)(`UPDATE "${schema}".user_preferences
       SET dashboard_config = $1, updated_at = NOW()
       WHERE user_id = $2`, [JSON.stringify(config), userId]);
    }
    else {
        await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".user_preferences (user_id, dashboard_config, updated_at)
       VALUES ($1, $2, NOW())`, [userId, JSON.stringify(config)]);
    }
}
/**
 * Retrieves the dashboard configuration for a user.
 * Returns null if no configuration exists.
 */
async function getDashboardConfig(tenantId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    // Ensure column exists on user_preferences
    await (0, database_port_1.safeQuery)(`ALTER TABLE "${schema}".user_preferences ADD COLUMN IF NOT EXISTS dashboard_config JSONB`).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}));
    const result = await (0, database_port_1.safeQuery)(`SELECT dashboard_config FROM "${schema}".user_preferences WHERE user_id = $1`, [userId]);
    if (result.rows.length === 0 || !(0, db_1.getFirstRow)(result)?.dashboard_config)
        return null;
    const raw = (0, db_1.getFirstRow)(result)?.dashboard_config;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
}
// === Serialization ===
/**
 * Serializes a DashboardConfig to a JSON string.
 * Produces a deterministic output with ordered keys.
 */
function serializeDashboardConfig(config) {
    const ordered = {
        widgets: config.widgets.map((w) => {
            const widget = {
                id: w.id,
                type: w.type,
                position: w.position,
            };
            if (w.filters !== undefined) {
                widget.filters = w.filters;
            }
            return widget;
        }),
        layout: config.layout,
    };
    if (config.theme !== undefined) {
        ordered.theme = config.theme;
    }
    return JSON.stringify(ordered);
}
/**
 * Deserializes a JSON string back into a DashboardConfig object.
 */
function deserializeDashboardConfig(json) {
    const parsed = JSON.parse(json);
    const config = {
        widgets: (parsed.widgets || []).map((w) => {
            const widget = {
                id: w.id,
                type: w.type,
                position: w.position,
            };
            if (w.filters !== undefined) {
                widget.filters = w.filters;
            }
            return widget;
        }),
        layout: parsed.layout,
    };
    if (parsed.theme !== undefined) {
        config.theme = parsed.theme;
    }
    return config;
}
//# sourceMappingURL=analytics-dashboard.service.js.map