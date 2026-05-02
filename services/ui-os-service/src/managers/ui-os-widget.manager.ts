import type { DbPool } from '../db.js';

export interface CatalogWidget {
  id: string;
  module_code: string;
  route: string;
  widget_key: string;
  zone: string;
  permission: string | null;
  profiles: string[] | null;
  config: Record<string, unknown> | null;
  sort_order: number;
  is_signature: boolean;
  is_active: boolean;
}

export interface WidgetInstance {
  id: string;
  dashboard_id: string;
  dashboard_key: string;
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

export interface WidgetInstanceCreate {
  dashboard_key: string;
  widget_key: string;
  instance_key: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  instance_config?: Record<string, unknown>;
  data_binding?: Record<string, unknown>;
  required_permission?: string | null;
  is_visible?: boolean;
}

export interface WidgetInstancePatch {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  instance_config?: Record<string, unknown>;
  data_binding?: Record<string, unknown>;
  required_permission?: string | null;
  is_visible?: boolean;
}

export class UiOsWidgetManager {
  constructor(private readonly pool: DbPool) {}

  async catalog(tenantId: string, moduleCode?: string | null): Promise<CatalogWidget[]> {
    const { rows } = await this.pool.query<CatalogWidget>(
      `SELECT id::text AS id, module_code, route, widget_key, zone,
              permission, profiles, config, sort_order, is_signature, is_active
         FROM dos.dynamic_ui_widgets
        WHERE is_active = TRUE
          AND (tenant_id IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR module_code = $2)
        ORDER BY module_code, route, sort_order, widget_key`,
      [tenantId, moduleCode ?? null],
    );
    return rows;
  }

  async listInstances(tenantId: string, dashboardKey?: string | null): Promise<WidgetInstance[]> {
    const { rows } = await this.pool.query<WidgetInstance>(
      `SELECT dw.id::text AS id, dw.dashboard_id::text AS dashboard_id,
              d.dashboard_key, dw.widget_key, dw.instance_key,
              dw.x, dw.y, dw.w, dw.h,
              dw.instance_config, dw.data_binding,
              dw.required_permission, dw.is_visible
         FROM dos.ui_dashboard_widgets dw
         JOIN dos.ui_dashboards d ON d.id = dw.dashboard_id
        WHERE dw.tenant_id = $1
          AND ($2::text IS NULL OR d.dashboard_key = $2)
        ORDER BY d.dashboard_key, dw.y, dw.x, dw.instance_key`,
      [tenantId, dashboardKey ?? null],
    );
    return rows;
  }

  async createInstance(tenantId: string, body: WidgetInstanceCreate): Promise<WidgetInstance | null> {
    const dRes = await this.pool.query<{ id: string }>(
      `SELECT id::text AS id FROM dos.ui_dashboards
        WHERE tenant_id = $1 AND dashboard_key = $2 LIMIT 1`,
      [tenantId, body.dashboard_key],
    );
    if (dRes.rowCount === 0) return null;
    const dashboardId = dRes.rows[0].id;
    const { rows } = await this.pool.query<WidgetInstance>(
      `INSERT INTO dos.ui_dashboard_widgets
        (tenant_id, dashboard_id, widget_key, instance_key,
         x, y, w, h, instance_config, data_binding,
         required_permission, is_visible)
       VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12)
       RETURNING id::text AS id, dashboard_id::text AS dashboard_id,
                 widget_key, instance_key, x, y, w, h,
                 instance_config, data_binding,
                 required_permission, is_visible`,
      [
        tenantId,
        dashboardId,
        body.widget_key,
        body.instance_key,
        body.x ?? 0,
        body.y ?? 0,
        body.w ?? 4,
        body.h ?? 3,
        JSON.stringify(body.instance_config ?? {}),
        JSON.stringify(body.data_binding ?? {}),
        body.required_permission ?? null,
        body.is_visible ?? true,
      ],
    );
    return { ...rows[0], dashboard_key: body.dashboard_key };
  }

  async updateInstance(tenantId: string, instanceKey: string, patch: WidgetInstancePatch): Promise<WidgetInstance | null> {
    const { rows } = await this.pool.query<WidgetInstance>(
      `UPDATE dos.ui_dashboard_widgets dw
          SET x                   = COALESCE($3, dw.x),
              y                   = COALESCE($4, dw.y),
              w                   = COALESCE($5, dw.w),
              h                   = COALESCE($6, dw.h),
              instance_config     = COALESCE($7::jsonb, dw.instance_config),
              data_binding        = COALESCE($8::jsonb, dw.data_binding),
              required_permission = COALESCE($9, dw.required_permission),
              is_visible          = COALESCE($10, dw.is_visible),
              updated_at          = NOW()
         FROM dos.ui_dashboards d
        WHERE d.id = dw.dashboard_id
          AND dw.tenant_id = $1
          AND dw.instance_key = $2
        RETURNING dw.id::text AS id, dw.dashboard_id::text AS dashboard_id,
                  d.dashboard_key,
                  dw.widget_key, dw.instance_key, dw.x, dw.y, dw.w, dw.h,
                  dw.instance_config, dw.data_binding,
                  dw.required_permission, dw.is_visible`,
      [
        tenantId,
        instanceKey,
        patch.x ?? null,
        patch.y ?? null,
        patch.w ?? null,
        patch.h ?? null,
        patch.instance_config !== undefined ? JSON.stringify(patch.instance_config) : null,
        patch.data_binding !== undefined ? JSON.stringify(patch.data_binding) : null,
        patch.required_permission ?? null,
        patch.is_visible ?? null,
      ],
    );
    return rows[0] ?? null;
  }

  async deleteInstance(tenantId: string, instanceKey: string): Promise<boolean> {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_dashboard_widgets
        WHERE tenant_id = $1 AND instance_key = $2`,
      [tenantId, instanceKey],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async refreshInstance(tenantId: string, instanceKey: string): Promise<{ instance_key: string; refreshed_at: string } | null> {
    const r = await this.pool.query<{ instance_key: string }>(
      `UPDATE dos.ui_dashboard_widgets
          SET updated_at = NOW()
        WHERE tenant_id = $1 AND instance_key = $2
        RETURNING instance_key`,
      [tenantId, instanceKey],
    );
    if (r.rowCount === 0) return null;
    return { instance_key: instanceKey, refreshed_at: new Date().toISOString() };
  }
}
