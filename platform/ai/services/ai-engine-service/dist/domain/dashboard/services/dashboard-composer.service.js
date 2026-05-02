import { safeQuery, tenantSchema } from '@dos/db';
function parseJsonb(val, fallback) {
    if (val === null || val === undefined)
        return fallback;
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        }
        catch {
            return fallback;
        }
    }
    return val;
}
export async function getDashboardCatalog(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT id, metadata, status, created_by, created_at FROM "${schema}".dashboard_layouts
     WHERE status != 'archived' ORDER BY created_at DESC LIMIT 100`).catch(() => ({ rows: [] }));
    return result.rows.map((row) => ({
        id: row.id,
        ...parseJsonb(row.metadata, {}),
        status: row.status,
        createdAt: row.created_at,
    }));
}
export async function getDashboardStats(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active
     FROM "${schema}".dashboard_layouts`).catch(() => ({ rows: [{ total: 0, active: 0 }] }));
    return { total: result.rows[0]?.total ?? 0, active: result.rows[0]?.active ?? 0 };
}
export async function getDashboardLayout(tenantId, dashboardId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT id, metadata, status, created_at FROM "${schema}".dashboard_layouts WHERE id = $1 LIMIT 1`, [dashboardId]).catch(() => ({ rows: [] }));
    if (!result.rows[0])
        return null;
    return { id: result.rows[0].id, ...parseJsonb(result.rows[0].metadata, {}) };
}
export async function loadCustomDashboard(tenantId, dashboardId) {
    return getDashboardLayout(tenantId, dashboardId);
}
export async function getHubDashboard(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT id, metadata FROM "${schema}".dashboard_layouts WHERE status = 'active' ORDER BY created_at LIMIT 1`).catch(() => ({ rows: [] }));
    return result.rows[0] ? { id: result.rows[0].id, ...parseJsonb(result.rows[0].metadata, {}) } : {};
}
export async function getRoleDashboard(tenantId, _role) {
    return getHubDashboard(tenantId);
}
export async function getStageDashboard(tenantId, _stage) {
    return getHubDashboard(tenantId);
}
export async function getDashboardsByCategory(tenantId, _category) {
    return getDashboardCatalog(tenantId);
}
export async function saveCustomDashboard(tenantId, userId, code, dashboard) {
    const schema = tenantSchema(tenantId);
    const metadata = {
        code,
        ...dashboard,
        savedBy: userId,
        savedAt: new Date().toISOString(),
    };
    await safeQuery(`INSERT INTO "${schema}".dashboard_layouts (tenant_id, status, metadata, created_by, updated_by)
     VALUES ($1, 'active', $2::jsonb, $3, $3)
     ON CONFLICT DO NOTHING`, [tenantId, JSON.stringify(metadata), String(userId ?? 'system')]).catch(async () => {
        await safeQuery(`INSERT INTO "${schema}".dashboard_layouts (tenant_id, status, metadata, created_by)
       VALUES ($1, 'active', $2::jsonb, $3)`, [tenantId, JSON.stringify(metadata), String(userId ?? 'system')]);
    });
    return { saved: true, code };
}
//# sourceMappingURL=dashboard-composer.service.js.map