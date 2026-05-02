"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertModuleView = assertModuleView;
exports.listForUser = listForUser;
exports.getOne = getOne;
exports.upsert = upsert;
exports.remove = remove;
exports.listShared = listShared;
const db_1 = require("@dos/db");
const metrics_1 = require("../observability/metrics");
const user_errors_1 = require("./contracts/user-errors");
const MODULE_RE = /^[a-z][a-z0-9_-]{0,63}$/;
const VIEW_RE = /^[a-z][a-z0-9_-]{0,63}$/;
const MAX_CONFIG_BYTES = 64 * 1024;
function assertModuleView(moduleCode, viewKey) {
    if (!MODULE_RE.test(moduleCode) || !VIEW_RE.test(viewKey)) {
        throw new user_errors_1.UserServiceError('VIEW_PREF_INVALID_KEY', undefined, { moduleCode, viewKey });
    }
}
function assertConfigSize(config) {
    const json = JSON.stringify(config ?? {});
    if (Buffer.byteLength(json, 'utf8') > MAX_CONFIG_BYTES) {
        throw new user_errors_1.UserServiceError('VIEW_PREF_CONFIG_TOO_LARGE', undefined, { limit: MAX_CONFIG_BYTES });
    }
}
async function listForUser(tenantId, userId, moduleFilter) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const where = moduleFilter ? 'AND module_code = $3' : '';
            const params = [userId, tenantId];
            if (moduleFilter)
                params.push(moduleFilter);
            const result = await c.query(`SELECT module_code, view_key, config, is_shared, updated_at
           FROM public.user_view_preferences
          WHERE user_id = $1::uuid AND tenant_id = $2 ${where}
          ORDER BY module_code ASC, view_key ASC`, params);
            return result.rows;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('viewPref.list', Date.now() - start);
    }
}
async function getOne(tenantId, userId, moduleCode, viewKey) {
    assertModuleView(moduleCode, viewKey);
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`SELECT module_code, view_key, config, is_shared, updated_at
           FROM public.user_view_preferences
          WHERE user_id = $1::uuid AND tenant_id = $2
            AND module_code = $3 AND view_key = $4`, [userId, tenantId, moduleCode, viewKey]);
            return result.rows[0] || null;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('viewPref.getOne', Date.now() - start);
    }
}
async function upsert(tenantId, userId, moduleCode, viewKey, input, opts = { canShare: false }) {
    assertModuleView(moduleCode, viewKey);
    assertConfigSize(input.config);
    if (input.isShared === true && !opts.canShare) {
        throw new user_errors_1.UserServiceError('VIEW_PREF_SHARE_FORBIDDEN');
    }
    const start = Date.now();
    try {
        const row = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`INSERT INTO public.user_view_preferences
           (user_id, tenant_id, module_code, view_key, config, is_shared, created_at, updated_at)
         VALUES ($1::uuid, $2, $3, $4, $5::jsonb, COALESCE($6, FALSE), NOW(), NOW())
         ON CONFLICT (tenant_id, user_id, module_code, view_key) DO UPDATE
           SET config = EXCLUDED.config,
               is_shared = EXCLUDED.is_shared,
               updated_at = NOW()
         RETURNING module_code, view_key, config, is_shared, updated_at`, [userId, tenantId, moduleCode, viewKey, JSON.stringify(input.config ?? {}), input.isShared ?? null]);
            return result.rows[0];
        });
        metrics_1.userMetrics.viewPrefUpsert(tenantId);
        return row;
    }
    finally {
        metrics_1.userMetrics.observeDb('viewPref.upsert', Date.now() - start);
    }
}
async function remove(tenantId, userId, moduleCode, viewKey) {
    assertModuleView(moduleCode, viewKey);
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`DELETE FROM public.user_view_preferences
           WHERE user_id = $1::uuid AND tenant_id = $2
             AND module_code = $3 AND view_key = $4`, [userId, tenantId, moduleCode, viewKey]);
            return result.rowCount ?? 0;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('viewPref.delete', Date.now() - start);
    }
}
async function listShared(tenantId, moduleFilter) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const where = moduleFilter ? 'AND module_code = $2' : '';
            const params = [tenantId];
            if (moduleFilter)
                params.push(moduleFilter);
            const result = await c.query(`SELECT user_id, module_code, view_key, config, is_shared, updated_at
           FROM public.user_view_preferences
          WHERE tenant_id = $1 AND is_shared = TRUE ${where}
          ORDER BY module_code ASC, view_key ASC, updated_at DESC
          LIMIT 500`, params);
            return result.rows;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('viewPref.listShared', Date.now() - start);
    }
}
//# sourceMappingURL=view-preference.service.js.map