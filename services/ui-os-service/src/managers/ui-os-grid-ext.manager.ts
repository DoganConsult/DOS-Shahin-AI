import type { DbPool } from '../db.js';

/**
 * Wave 11b-§6 Grids — extended manager for the 7 §6 tables created by
 * migrations 20260502_0103/0104/0105:
 *
 *   ui_data_grid_column_catalog
 *   ui_data_grid_column_permissions
 *   ui_data_grid_saved_views
 *   ui_data_grid_exports
 *   ui_data_grid_bulk_jobs
 *   ui_data_grid_inline_edit_sessions
 *   ui_data_grid_validation_errors
 *
 * Pre-existing UiOsGridStateManager owns dos.ui_data_grid_states
 * (per-user grid UI state). This manager owns the structural catalog +
 * async runtime tables. All queries scope by tenant_id.
 */
export class UiOsGridExtManager {
  constructor(private readonly pool: DbPool) {}

  // ── column catalog ──────────────────────────────────────────
  async listColumns(tenantId: string, gridKey: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, tenant_id, grid_key, column_key,
              data_type::text AS data_type, cell_renderer_key,
              header_key, description_key,
              default_width_px, min_width_px, max_width_px,
              is_sortable, is_filterable, is_editable, is_pinnable, is_resizable,
              display_order, metadata, is_active
         FROM dos.ui_data_grid_column_catalog
        WHERE tenant_id=$1 AND grid_key=$2
        ORDER BY display_order, column_key`,
      [tenantId, gridKey],
    );
    return rows;
  }
  async upsertColumn(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_data_grid_column_catalog
        (tenant_id, grid_key, column_key, data_type, cell_renderer_key,
         header_key, description_key, default_width_px, min_width_px, max_width_px,
         is_sortable, is_filterable, is_editable, is_pinnable, is_resizable,
         display_order, metadata, created_by, updated_by)
       VALUES ($1,$2,$3,$4::dos.ui_grid_column_data_type_t,$5,$6,$7,$8,$9,$10,
               COALESCE($11,TRUE),COALESCE($12,TRUE),COALESCE($13,FALSE),COALESCE($14,TRUE),COALESCE($15,TRUE),
               COALESCE($16,0),COALESCE($17::jsonb,'{}'::jsonb),$18,$18)
       ON CONFLICT (tenant_id, grid_key, column_key) DO UPDATE
         SET data_type=EXCLUDED.data_type,
             cell_renderer_key=EXCLUDED.cell_renderer_key,
             header_key=EXCLUDED.header_key,
             description_key=EXCLUDED.description_key,
             default_width_px=EXCLUDED.default_width_px,
             min_width_px=EXCLUDED.min_width_px,
             max_width_px=EXCLUDED.max_width_px,
             is_sortable=EXCLUDED.is_sortable,
             is_filterable=EXCLUDED.is_filterable,
             is_editable=EXCLUDED.is_editable,
             is_pinnable=EXCLUDED.is_pinnable,
             is_resizable=EXCLUDED.is_resizable,
             display_order=EXCLUDED.display_order,
             metadata=EXCLUDED.metadata,
             updated_by=EXCLUDED.updated_by,
             updated_at=NOW()
       RETURNING id::text, column_key, data_type::text AS data_type, display_order, is_active`,
      [tenantId, body.grid_key, body.column_key, body.data_type, body.cell_renderer_key ?? null,
       body.header_key ?? null, body.description_key ?? null,
       body.default_width_px ?? null, body.min_width_px ?? null, body.max_width_px ?? null,
       body.is_sortable ?? null, body.is_filterable ?? null, body.is_editable ?? null,
       body.is_pinnable ?? null, body.is_resizable ?? null,
       body.display_order ?? null,
       body.metadata !== undefined ? JSON.stringify(body.metadata) : null, userId],
    );
    return rows[0];
  }
  async deleteColumn(tenantId: string, columnId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_data_grid_column_catalog WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, columnId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── column permissions ─────────────────────────────────────
  async listColumnPermissions(tenantId: string, columnId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, permission_code, effect::text AS effect, capability::text AS capability,
              role_code, user_id, is_active
         FROM dos.ui_data_grid_column_permissions
        WHERE tenant_id=$1 AND column_catalog_id=$2::uuid
        ORDER BY permission_code`,
      [tenantId, columnId]);
    return rows;
  }
  async upsertColumnPermission(tenantId: string, userId: string, columnId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_data_grid_column_permissions
        (tenant_id, column_catalog_id, permission_code, effect, capability, role_code, user_id, created_by, updated_by)
       VALUES ($1,$2::uuid,$3,$4::dos.ui_perm_effect_t,COALESCE($5,'view')::dos.ui_grid_column_capability_t,$6,$7,$8,$8)
       ON CONFLICT (column_catalog_id, permission_code, capability, role_code, user_id)
       DO UPDATE SET effect=EXCLUDED.effect, updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, permission_code, effect::text AS effect, capability::text AS capability, role_code, user_id`,
      [tenantId, columnId, body.permission_code, body.effect, body.capability ?? null,
       body.role_code ?? null, body.user_id ?? null, userId]);
    return rows[0];
  }
  async deleteColumnPermission(tenantId: string, permissionId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_data_grid_column_permissions WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, permissionId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── grid-scoped saved views ────────────────────────────────
  async listSavedViews(tenantId: string, gridKey: string, userId?: string | null) {
    const { rows } = await this.pool.query(
      `SELECT id::text, grid_key, view_key, user_id, name_key, view_config,
              is_shared, is_default, is_active
         FROM dos.ui_data_grid_saved_views
        WHERE tenant_id=$1 AND grid_key=$2
          AND (user_id IS NULL OR user_id=$3 OR is_shared=TRUE)
        ORDER BY is_default DESC, view_key`,
      [tenantId, gridKey, userId ?? null]);
    return rows;
  }
  async upsertSavedView(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_data_grid_saved_views
        (tenant_id, grid_key, view_key, user_id, name_key, view_config, is_shared, is_default, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6::jsonb,'{}'::jsonb),COALESCE($7,FALSE),COALESCE($8,FALSE),$9,$9)
       ON CONFLICT (tenant_id, grid_key, view_key, user_id) DO UPDATE
         SET name_key=EXCLUDED.name_key, view_config=EXCLUDED.view_config,
             is_shared=EXCLUDED.is_shared, is_default=EXCLUDED.is_default,
             updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, view_key, is_shared, is_default`,
      [tenantId, body.grid_key, body.view_key, body.user_id ?? null, body.name_key ?? null,
       body.view_config !== undefined ? JSON.stringify(body.view_config) : null,
       body.is_shared ?? null, body.is_default ?? null, userId]);
    return rows[0];
  }
  async deleteSavedView(tenantId: string, viewId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_data_grid_saved_views WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, viewId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── exports ────────────────────────────────────────────────
  async listExports(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, grid_key, view_id::text AS view_id, format::text AS format,
              filters, row_count, status::text AS status, download_url, error,
              expires_at, started_at, completed_at, created_at
         FROM dos.ui_data_grid_exports
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY created_at DESC LIMIT 200`,
      [tenantId, userId]);
    return rows;
  }
  async createExport(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_data_grid_exports
        (tenant_id, user_id, grid_key, view_id, format, filters)
       VALUES ($1,$2,$3,$4::uuid,$5::dos.ui_grid_export_format_t,COALESCE($6::jsonb,'{}'::jsonb))
       RETURNING id::text, grid_key, format::text AS format, status::text AS status, created_at`,
      [tenantId, userId, body.grid_key, body.view_id ?? null, body.format,
       body.filters !== undefined ? JSON.stringify(body.filters) : null]);
    return rows[0];
  }

  // ── bulk jobs ──────────────────────────────────────────────
  async listBulkJobs(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, grid_key, action_kind, status::text AS status,
              progress, error, started_at, completed_at, created_at
         FROM dos.ui_data_grid_bulk_jobs
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY created_at DESC LIMIT 200`,
      [tenantId, userId]);
    return rows;
  }
  async createBulkJob(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_data_grid_bulk_jobs
        (tenant_id, user_id, grid_key, action_kind, targets, payload)
       VALUES ($1,$2,$3,$4,COALESCE($5::jsonb,'[]'::jsonb),COALESCE($6::jsonb,'{}'::jsonb))
       RETURNING id::text, grid_key, action_kind, status::text AS status, progress, created_at`,
      [tenantId, userId, body.grid_key, body.action_kind,
       body.targets !== undefined ? JSON.stringify(body.targets) : null,
       body.payload !== undefined ? JSON.stringify(body.payload) : null]);
    return rows[0];
  }

  // ── inline edit sessions ───────────────────────────────────
  async getInlineEditSession(tenantId: string, sessionKey: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, session_key, grid_key, row_pk, draft_payload, expires_at, is_active
         FROM dos.ui_data_grid_inline_edit_sessions
        WHERE tenant_id=$1 AND session_key=$2 LIMIT 1`,
      [tenantId, sessionKey]);
    return rows[0] ?? null;
  }
  async upsertInlineEditSession(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_data_grid_inline_edit_sessions
        (tenant_id, user_id, session_key, grid_key, row_pk, draft_payload, expires_at)
       VALUES ($1,$2,$3,$4,COALESCE($5::jsonb,'{}'::jsonb),COALESCE($6::jsonb,'{}'::jsonb),
               COALESCE($7::timestamptz, NOW() + INTERVAL '1 hour'))
       ON CONFLICT (tenant_id, session_key) DO UPDATE
         SET row_pk=EXCLUDED.row_pk, draft_payload=EXCLUDED.draft_payload,
             expires_at=EXCLUDED.expires_at, updated_at=NOW()
       RETURNING id::text, session_key, grid_key, expires_at, is_active`,
      [tenantId, userId, body.session_key, body.grid_key,
       body.row_pk !== undefined ? JSON.stringify(body.row_pk) : null,
       body.draft_payload !== undefined ? JSON.stringify(body.draft_payload) : null,
       body.expires_at ?? null]);
    return rows[0];
  }
  async listValidationErrors(tenantId: string, sessionId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, column_key, error_code, message_key, details, created_at
         FROM dos.ui_data_grid_validation_errors
        WHERE tenant_id=$1 AND inline_edit_session_id=$2::uuid
        ORDER BY column_key, error_code`,
      [tenantId, sessionId]);
    return rows;
  }
  async upsertValidationError(tenantId: string, sessionId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_data_grid_validation_errors
        (tenant_id, inline_edit_session_id, column_key, error_code, message_key, details)
       VALUES ($1,$2::uuid,$3,$4,$5,COALESCE($6::jsonb,'{}'::jsonb))
       ON CONFLICT (inline_edit_session_id, column_key, error_code) DO UPDATE
         SET message_key=EXCLUDED.message_key, details=EXCLUDED.details
       RETURNING id::text, column_key, error_code`,
      [tenantId, sessionId, body.column_key, body.error_code, body.message_key ?? null,
       body.details !== undefined ? JSON.stringify(body.details) : null]);
    return rows[0];
  }
}
