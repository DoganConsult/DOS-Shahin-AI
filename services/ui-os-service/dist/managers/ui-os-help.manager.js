export class UiOsHelpManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async contextual(tenantId, moduleCode, routeKey) {
        const { rows } = await this.pool.query(`SELECT 'tour'::text AS source, tour_key AS key,
              COALESCE(title_key, tour_key) AS label,
              NULL::text AS url, module_code, NULL::text AS route_key
         FROM dos.ui_tours
        WHERE is_active = TRUE
          AND (tenant_id IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR module_code = $2 OR module_code IS NULL)
        ORDER BY tour_key
        LIMIT 25`, [tenantId, moduleCode ?? null]);
        const { rows: anns } = await this.pool.query(`SELECT 'announcement'::text AS source,
              announcement_key AS key, COALESCE(title_key, announcement_key) AS label,
              cta_url AS url, module_code, NULL::text AS route_key
         FROM dos.ui_announcements
        WHERE is_active = TRUE
          AND (tenant_id IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR module_code = $2 OR module_code IS NULL)
        ORDER BY starts_at DESC NULLS LAST
        LIMIT 10`, [tenantId, moduleCode ?? null]).catch(() => ({ rows: [] }));
        void routeKey;
        return [...rows, ...anns];
    }
}
//# sourceMappingURL=ui-os-help.manager.js.map