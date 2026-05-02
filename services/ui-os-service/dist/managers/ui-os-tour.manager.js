export class UiOsTourManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async list(tenantId, userId, productCode, moduleCode) {
        const { rows } = await this.pool.query(`SELECT t.id::text AS id, t.tour_key, t.product_code, t.module_code,
              t.title_key, t.description_key, t.steps, t.required_permission,
              t.trigger_config, t.is_active,
              c.status      AS user_status,
              c.completed_at::text AS user_completed_at
         FROM dos.ui_tours t
         LEFT JOIN dos.ui_user_tours_completed c
           ON c.tenant_id = $1 AND c.user_id = $2 AND c.tour_key = t.tour_key
        WHERE t.is_active = TRUE
          AND (t.tenant_id IS NULL OR t.tenant_id = $1)
          AND ($3::text IS NULL OR t.product_code = $3)
          AND ($4::text IS NULL OR t.module_code  = $4)
        ORDER BY t.product_code NULLS FIRST, t.module_code NULLS FIRST, t.tour_key`, [tenantId, userId, productCode ?? null, moduleCode ?? null]);
        return rows;
    }
    async getByKey(tenantId, userId, tourKey) {
        const { rows } = await this.pool.query(`SELECT t.id::text AS id, t.tour_key, t.product_code, t.module_code,
              t.title_key, t.description_key, t.steps, t.required_permission,
              t.trigger_config, t.is_active,
              c.status      AS user_status,
              c.completed_at::text AS user_completed_at
         FROM dos.ui_tours t
         LEFT JOIN dos.ui_user_tours_completed c
           ON c.tenant_id = $1 AND c.user_id = $2 AND c.tour_key = t.tour_key
        WHERE t.tour_key = $3 AND (t.tenant_id IS NULL OR t.tenant_id = $1)
        LIMIT 1`, [tenantId, userId, tourKey]);
        return rows[0] ?? null;
    }
    async mark(tenantId, userId, tourKey, status, lastStepKey) {
        const at = new Date().toISOString();
        await this.pool.query(`INSERT INTO dos.ui_user_tours_completed
        (tenant_id, user_id, tour_key, status, completed_at, skipped_at, last_step_key, updated_at)
       VALUES ($1,$2,$3,$4::varchar, CASE WHEN $4::varchar='completed' THEN NOW() END,
                                      CASE WHEN $4::varchar='skipped'   THEN NOW() END,
                                      $5, NOW())
       ON CONFLICT (tenant_id, user_id, tour_key) DO UPDATE
         SET status        = EXCLUDED.status,
             completed_at  = COALESCE(EXCLUDED.completed_at, dos.ui_user_tours_completed.completed_at),
             skipped_at    = COALESCE(EXCLUDED.skipped_at,   dos.ui_user_tours_completed.skipped_at),
             last_step_key = COALESCE(EXCLUDED.last_step_key, dos.ui_user_tours_completed.last_step_key),
             updated_at    = NOW()`, [tenantId, userId, tourKey, status, lastStepKey ?? null]);
        return { tour_key: tourKey, status, at };
    }
}
//# sourceMappingURL=ui-os-tour.manager.js.map