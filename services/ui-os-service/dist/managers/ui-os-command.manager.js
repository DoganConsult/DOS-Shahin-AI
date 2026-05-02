export class UiOsCommandManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async list(tenantId, productCode, moduleCode) {
        // 6NF — required_role_codes lives in dos.ui_command_palette_item_roles (migration 0133).
        const { rows } = await this.pool.query(`SELECT c.id::text AS id, c.command_key, c.label_key, c.description_key, c.icon, c.shortcut,
              c.command_type, c.command_payload, c.required_permission,
              COALESCE(
                (SELECT ARRAY_AGG(r.role_code ORDER BY r.role_code)
                   FROM dos.ui_command_palette_item_roles r WHERE r.item_id = c.id),
                ARRAY[]::TEXT[]
              ) AS required_role_codes,
              c.keywords, c.sort_order,
              c.product_code, c.module_code
         FROM dos.ui_command_palette_items c
        WHERE c.is_active = TRUE
          AND (c.tenant_id IS NULL OR c.tenant_id = $1)
          AND ($2::text IS NULL OR c.product_code = $2 OR c.product_code IS NULL)
          AND ($3::text IS NULL OR c.module_code  = $3 OR c.module_code  IS NULL)
        ORDER BY c.sort_order, c.command_key`, [tenantId, productCode ?? null, moduleCode ?? null]);
        return rows;
    }
    async execute(tenantId, commandKey) {
        const { rows } = await this.pool.query(`SELECT c.id::text AS id, c.command_key, c.label_key, c.description_key, c.icon, c.shortcut,
              c.command_type, c.command_payload, c.required_permission,
              COALESCE(
                (SELECT ARRAY_AGG(r.role_code ORDER BY r.role_code)
                   FROM dos.ui_command_palette_item_roles r WHERE r.item_id = c.id),
                ARRAY[]::TEXT[]
              ) AS required_role_codes,
              c.keywords, c.sort_order,
              c.product_code, c.module_code
         FROM dos.ui_command_palette_items c
        WHERE c.is_active = TRUE
          AND (c.tenant_id IS NULL OR c.tenant_id = $1)
          AND c.command_key = $2
        LIMIT 1`, [tenantId, commandKey]);
        if (rows.length === 0)
            return null;
        const c = rows[0];
        return {
            command_key: c.command_key,
            command_type: c.command_type,
            command_payload: c.command_payload,
            executed_at: new Date().toISOString(),
        };
    }
}
//# sourceMappingURL=ui-os-command.manager.js.map