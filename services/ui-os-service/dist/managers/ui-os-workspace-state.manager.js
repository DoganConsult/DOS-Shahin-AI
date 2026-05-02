const EMPTY = {
    workspace_key: 'default',
    product_code: null,
    active_module_code: null,
    active_route: null,
    open_apps: [],
    panels: {},
    layout_snapshot: {},
    saved_at: null,
};
export class UiOsWorkspaceStateManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async get(tenantId, userId, workspaceKey = 'default') {
        const { rows } = await this.pool.query(`SELECT workspace_key, product_code, active_module_code, active_route,
              open_apps, panels, layout_snapshot, saved_at::text AS saved_at
         FROM dos.ui_workspace_states
        WHERE tenant_id = $1 AND user_id = $2 AND workspace_key = $3
        LIMIT 1`, [tenantId, userId, workspaceKey]);
        if (rows.length === 0)
            return { ...EMPTY, workspace_key: workspaceKey };
        const r = rows[0];
        return {
            workspace_key: r.workspace_key,
            product_code: r.product_code ?? null,
            active_module_code: r.active_module_code ?? null,
            active_route: r.active_route ?? null,
            open_apps: r.open_apps ?? [],
            panels: r.panels ?? {},
            layout_snapshot: r.layout_snapshot ?? {},
            saved_at: r.saved_at ?? null,
        };
    }
    async upsert(tenantId, userId, workspaceKey, patch) {
        const current = await this.get(tenantId, userId, workspaceKey);
        const merged = {
            workspace_key: workspaceKey,
            product_code: patch.product_code ?? current.product_code,
            active_module_code: patch.active_module_code ?? current.active_module_code,
            active_route: patch.active_route ?? current.active_route,
            open_apps: patch.open_apps !== undefined ? patch.open_apps : current.open_apps,
            panels: patch.panels !== undefined ? patch.panels : current.panels,
            layout_snapshot: patch.layout_snapshot !== undefined ? patch.layout_snapshot : current.layout_snapshot,
            saved_at: new Date().toISOString(),
        };
        await this.pool.query(`INSERT INTO dos.ui_workspace_states
        (tenant_id, user_id, workspace_key, product_code, active_module_code,
         active_route, open_apps, panels, layout_snapshot, saved_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb, NOW(), NOW())
       ON CONFLICT (tenant_id, user_id, workspace_key) DO UPDATE
         SET product_code        = EXCLUDED.product_code,
             active_module_code  = EXCLUDED.active_module_code,
             active_route        = EXCLUDED.active_route,
             open_apps           = EXCLUDED.open_apps,
             panels              = EXCLUDED.panels,
             layout_snapshot     = EXCLUDED.layout_snapshot,
             saved_at            = NOW(),
             updated_at          = NOW()`, [
            tenantId,
            userId,
            workspaceKey,
            merged.product_code,
            merged.active_module_code,
            merged.active_route,
            JSON.stringify(merged.open_apps ?? []),
            JSON.stringify(merged.panels ?? {}),
            JSON.stringify(merged.layout_snapshot ?? {}),
        ]);
        return merged;
    }
    async reset(tenantId, userId, workspaceKey = 'default') {
        await this.pool.query(`DELETE FROM dos.ui_workspace_states
        WHERE tenant_id = $1 AND user_id = $2 AND workspace_key = $3`, [tenantId, userId, workspaceKey]);
        return { ...EMPTY, workspace_key: workspaceKey };
    }
    async snapshot(tenantId, userId, workspaceKey, snapshotKey) {
        const current = await this.get(tenantId, userId, workspaceKey);
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_workspace_snapshots
        (tenant_id, user_id, workspace_key, snapshot_key,
         product_code, active_module_code, active_route,
         open_apps, panels, layout_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb)
       ON CONFLICT (tenant_id, user_id, workspace_key, snapshot_key) DO UPDATE
         SET product_code       = EXCLUDED.product_code,
             active_module_code = EXCLUDED.active_module_code,
             active_route       = EXCLUDED.active_route,
             open_apps          = EXCLUDED.open_apps,
             panels             = EXCLUDED.panels,
             layout_snapshot    = EXCLUDED.layout_snapshot,
             created_at         = NOW()
       RETURNING id::text AS id, workspace_key, snapshot_key,
                 active_module_code, active_route,
                 open_apps, panels, layout_snapshot,
                 created_at::text AS created_at`, [
            tenantId,
            userId,
            workspaceKey,
            snapshotKey,
            current.product_code,
            current.active_module_code,
            current.active_route,
            JSON.stringify(current.open_apps ?? []),
            JSON.stringify(current.panels ?? {}),
            JSON.stringify(current.layout_snapshot ?? {}),
        ]);
        return rows[0];
    }
    async restore(tenantId, userId, snapshotId) {
        const { rows } = await this.pool.query(`SELECT workspace_key, product_code, active_module_code, active_route,
              open_apps, panels, layout_snapshot
         FROM dos.ui_workspace_snapshots
        WHERE tenant_id = $1 AND user_id = $2 AND id = $3::uuid
        LIMIT 1`, [tenantId, userId, snapshotId]);
        if (rows.length === 0) {
            throw new Error('snapshot_not_found');
        }
        const s = rows[0];
        return this.upsert(tenantId, userId, s.workspace_key, {
            product_code: s.product_code,
            active_module_code: s.active_module_code,
            active_route: s.active_route,
            open_apps: s.open_apps,
            panels: s.panels,
            layout_snapshot: s.layout_snapshot,
        });
    }
}
//# sourceMappingURL=ui-os-workspace-state.manager.js.map