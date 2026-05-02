import type { DbPool } from '../db.js';

export interface Dashboard {
  id: string;
  dashboard_key: string;
  product_code: string | null;
  module_code: string | null;
  title_key: string | null;
  description_key: string | null;
  visibility: string;
  required_permission: string | null;
  role_codes: string[];
  layout_config: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  widget_key: string;
  instance_key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  instance_config: Record<string, unknown>;
  data_binding: Record<string, unknown>;
  required_permission: string | null;
  is_visible: boolean;
}

export interface DashboardCreate {
  dashboard_key: string;
  product_code?: string | null;
  module_code?: string | null;
  title_key?: string | null;
  description_key?: string | null;
  visibility?: string;
  required_permission?: string | null;
  role_codes?: string[];
  layout_config?: Record<string, unknown>;
  is_default?: boolean;
}

export interface DashboardPatch {
  product_code?: string | null;
  module_code?: string | null;
  title_key?: string | null;
  description_key?: string | null;
  visibility?: string;
  required_permission?: string | null;
  role_codes?: string[];
  layout_config?: Record<string, unknown>;
  is_default?: boolean;
  is_active?: boolean;
}

export interface DashboardLayoutPatch {
  layout_config: Record<string, unknown>;
  widgets?: Array<{
    instance_key: string;
    widget_key: string;
    x: number;
    y: number;
    w: number;
    h: number;
    instance_config?: Record<string, unknown>;
    data_binding?: Record<string, unknown>;
    required_permission?: string | null;
    is_visible?: boolean;
  }>;
}

/**
 * 6NF storage: role_codes are persisted in dos.ui_dashboard_roles (junction).
 * The legacy ui_dashboards.role_codes TEXT[] column was dropped by migration
 * 20260502_0133. Reads aggregate via LEFT JOIN; writes manage the junction
 * inside the same transaction as the parent row.
 */
const SELECT_DASHBOARD_COLS = `
  d.id::text AS id, d.dashboard_key, d.product_code, d.module_code,
  d.title_key, d.description_key, d.visibility, d.required_permission,
  COALESCE(
    (SELECT ARRAY_AGG(r.role_code ORDER BY r.role_code)
       FROM dos.ui_dashboard_roles r WHERE r.dashboard_id = d.id),
    ARRAY[]::TEXT[]
  ) AS role_codes,
  d.layout_config, d.is_default, d.is_active, d.created_by,
  d.created_at::text AS created_at, d.updated_at::text AS updated_at
`.trim();

export class UiOsDashboardManager {
  constructor(private readonly pool: DbPool) {}

  private async syncRoles(client: { query: DbPool['query'] }, dashboardId: string, roleCodes: string[] | null | undefined): Promise<void> {
    if (roleCodes === null || roleCodes === undefined) return;
    await client.query(`DELETE FROM dos.ui_dashboard_roles WHERE dashboard_id = $1::uuid`, [dashboardId]);
    if (roleCodes.length === 0) return;
    await client.query(
      `INSERT INTO dos.ui_dashboard_roles (dashboard_id, role_code)
       SELECT $1::uuid, UNNEST($2::text[]) ON CONFLICT DO NOTHING`,
      [dashboardId, roleCodes],
    );
  }

  async list(tenantId: string, productCode?: string | null, moduleCode?: string | null): Promise<Dashboard[]> {
    const { rows } = await this.pool.query<Dashboard>(
      `SELECT ${SELECT_DASHBOARD_COLS}
         FROM dos.ui_dashboards d
        WHERE d.tenant_id = $1 AND d.is_active = TRUE
          AND ($2::text IS NULL OR d.product_code = $2)
          AND ($3::text IS NULL OR d.module_code  = $3)
        ORDER BY d.is_default DESC, d.dashboard_key`,
      [tenantId, productCode ?? null, moduleCode ?? null],
    );
    return rows;
  }

  async getByKey(tenantId: string, dashboardKey: string): Promise<{ dashboard: Dashboard; widgets: DashboardWidget[] } | null> {
    const { rows } = await this.pool.query<Dashboard>(
      `SELECT ${SELECT_DASHBOARD_COLS}
         FROM dos.ui_dashboards d
        WHERE d.tenant_id = $1 AND d.dashboard_key = $2
        LIMIT 1`,
      [tenantId, dashboardKey],
    );
    if (rows.length === 0) return null;
    const dashboard = rows[0];
    const w = await this.pool.query<DashboardWidget>(
      `SELECT id::text AS id, dashboard_id::text AS dashboard_id,
              widget_key, instance_key, x, y, w, h,
              instance_config, data_binding, required_permission, is_visible
         FROM dos.ui_dashboard_widgets
        WHERE tenant_id = $1 AND dashboard_id = $2::uuid
        ORDER BY y, x, instance_key`,
      [tenantId, dashboard.id],
    );
    return { dashboard, widgets: w.rows };
  }

  async create(tenantId: string, createdBy: string, body: DashboardCreate): Promise<Dashboard> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const ins = await client.query<{ id: string }>(
        `INSERT INTO dos.ui_dashboards
          (tenant_id, dashboard_key, product_code, module_code,
           title_key, description_key, visibility, required_permission,
           layout_config, is_default, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
         RETURNING id::text AS id`,
        [
          tenantId,
          body.dashboard_key,
          body.product_code ?? null,
          body.module_code ?? null,
          body.title_key ?? null,
          body.description_key ?? null,
          body.visibility ?? 'tenant',
          body.required_permission ?? null,
          JSON.stringify(body.layout_config ?? {}),
          body.is_default ?? false,
          createdBy,
        ],
      );
      const dashboardId = ins.rows[0].id;
      await this.syncRoles(client, dashboardId, body.role_codes ?? []);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    const result = await this.getByKey(tenantId, body.dashboard_key);
    if (!result) throw new Error('dashboard_create_inconsistency');
    return result.dashboard;
  }

  async update(tenantId: string, dashboardKey: string, patch: DashboardPatch): Promise<Dashboard | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const upd = await client.query<{ id: string }>(
        `UPDATE dos.ui_dashboards
            SET product_code        = COALESCE($3, product_code),
                module_code         = COALESCE($4, module_code),
                title_key           = COALESCE($5, title_key),
                description_key     = COALESCE($6, description_key),
                visibility          = COALESCE($7, visibility),
                required_permission = COALESCE($8, required_permission),
                layout_config       = COALESCE($9::jsonb, layout_config),
                is_default          = COALESCE($10, is_default),
                is_active           = COALESCE($11, is_active),
                updated_at          = NOW()
          WHERE tenant_id = $1 AND dashboard_key = $2
          RETURNING id::text AS id`,
        [
          tenantId,
          dashboardKey,
          patch.product_code ?? null,
          patch.module_code ?? null,
          patch.title_key ?? null,
          patch.description_key ?? null,
          patch.visibility ?? null,
          patch.layout_config !== undefined ? JSON.stringify(patch.layout_config) : null,
          patch.is_default ?? null,
          patch.is_active ?? null,
          patch.required_permission ?? null,
        ],
      );
      if (upd.rowCount === 0) { await client.query('ROLLBACK'); return null; }
      await this.syncRoles(client, upd.rows[0].id, patch.role_codes);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    const result = await this.getByKey(tenantId, dashboardKey);
    return result?.dashboard ?? null;
  }

  async setLayout(tenantId: string, dashboardKey: string, patch: DashboardLayoutPatch): Promise<{ dashboard: Dashboard; widgets: DashboardWidget[] } | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const dRes = await client.query<{ id: string }>(
        `UPDATE dos.ui_dashboards
            SET layout_config = $3::jsonb, updated_at = NOW()
          WHERE tenant_id = $1 AND dashboard_key = $2
          RETURNING id::text AS id`,
        [tenantId, dashboardKey, JSON.stringify(patch.layout_config ?? {})],
      );
      if (dRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const dashboardId = dRes.rows[0].id;
      if (patch.widgets) {
        await client.query(
          `DELETE FROM dos.ui_dashboard_widgets WHERE tenant_id = $1 AND dashboard_id = $2::uuid`,
          [tenantId, dashboardId],
        );
        for (const w of patch.widgets) {
          await client.query(
            `INSERT INTO dos.ui_dashboard_widgets
              (tenant_id, dashboard_id, widget_key, instance_key,
               x, y, w, h, instance_config, data_binding,
               required_permission, is_visible)
             VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12)`,
            [
              tenantId,
              dashboardId,
              w.widget_key,
              w.instance_key,
              w.x,
              w.y,
              w.w,
              w.h,
              JSON.stringify(w.instance_config ?? {}),
              JSON.stringify(w.data_binding ?? {}),
              w.required_permission ?? null,
              w.is_visible ?? true,
            ],
          );
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return this.getByKey(tenantId, dashboardKey);
  }

  async remove(tenantId: string, dashboardKey: string): Promise<boolean> {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_dashboards WHERE tenant_id = $1 AND dashboard_key = $2`,
      [tenantId, dashboardKey],
    );
    return (r.rowCount ?? 0) > 0;
  }
}
