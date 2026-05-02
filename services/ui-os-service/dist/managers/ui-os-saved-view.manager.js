export class UiOsSavedViewManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async list(tenantId, userId, moduleCode) {
        const { rows } = await this.pool.query(`SELECT id::text AS id, view_key, scope, module_code, route_key,
              entity_type, name, description, view_config, is_default, is_shared,
              required_permission
         FROM dos.ui_saved_views
        WHERE tenant_id = $1
          AND (user_id = $2 OR is_shared = TRUE OR user_id IS NULL)
          AND ($3::text IS NULL OR module_code = $3)
        ORDER BY is_default DESC, name`, [tenantId, userId, moduleCode ?? null]);
        return rows;
    }
    async create(tenantId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_saved_views
        (tenant_id, user_id, view_key, scope, module_code, route_key,
         entity_type, name, description, view_config, is_default, is_shared,
         required_permission)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13)
       RETURNING id::text AS id, view_key, scope, module_code, route_key,
                 entity_type, name, description, view_config, is_default, is_shared,
                 required_permission`, [
            tenantId, userId, body.view_key,
            body.scope ?? 'user',
            body.module_code ?? null,
            body.route_key ?? null,
            body.entity_type ?? null,
            body.name,
            body.description ?? null,
            JSON.stringify(body.view_config ?? {}),
            body.is_default ?? false,
            body.is_shared ?? false,
            body.required_permission ?? null,
        ]);
        return rows[0];
    }
    async update(tenantId, viewId, patch) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_saved_views
          SET name        = COALESCE($3, name),
              description = COALESCE($4, description),
              view_config = COALESCE($5::jsonb, view_config),
              is_default  = COALESCE($6, is_default),
              is_shared   = COALESCE($7, is_shared),
              updated_at  = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING id::text AS id, view_key, scope, module_code, route_key,
                  entity_type, name, description, view_config, is_default, is_shared,
                  required_permission`, [
            tenantId, viewId,
            patch.name ?? null,
            patch.description ?? null,
            patch.view_config !== undefined ? JSON.stringify(patch.view_config) : null,
            patch.is_default ?? null,
            patch.is_shared ?? null,
        ]);
        return rows[0] ?? null;
    }
    async remove(tenantId, viewId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_saved_views WHERE tenant_id = $1 AND id = $2::uuid`, [tenantId, viewId]);
        return (r.rowCount ?? 0) > 0;
    }
}
//# sourceMappingURL=ui-os-saved-view.manager.js.map