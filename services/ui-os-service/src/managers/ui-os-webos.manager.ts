import type { DbPool } from '../db.js';

/**
 * Wave 11j-§14 WebOS — manager covering 8 §14 tables (migrations 0119+0120):
 * workspace_sessions, window_states, panel_states, tab_states,
 * split_view_states, drag_drop_layout_events, clipboard_items,
 * workspace_restore_points.
 */
export class UiOsWebOsManager {
  constructor(private readonly pool: DbPool) {}

  // ── Workspace sessions ──────────────────────────────────────
  async listSessions(tenantId: string, userId: string, includeEnded = false) {
    const { rows } = await this.pool.query(
      `SELECT id::text, client_id, started_at, last_active_at, ended_at, metadata
         FROM dos.ui_workspace_sessions
        WHERE tenant_id=$1 AND user_id=$2
          AND ($3::boolean OR ended_at IS NULL)
        ORDER BY last_active_at DESC`, [tenantId, userId, includeEnded]);
    return rows;
  }
  async startSession(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_workspace_sessions (tenant_id, user_id, client_id, metadata)
       VALUES ($1,$2,$3,COALESCE($4::jsonb,'{}'::jsonb))
       RETURNING id::text, started_at, last_active_at`,
      [tenantId, userId, body.client_id ?? null,
       body.metadata !== undefined ? JSON.stringify(body.metadata) : null]);
    return rows[0];
  }
  async touchSession(tenantId: string, userId: string, sessionId: string) {
    const { rows } = await this.pool.query(
      `UPDATE dos.ui_workspace_sessions SET last_active_at=NOW()
        WHERE tenant_id=$1 AND user_id=$2 AND id=$3::uuid AND ended_at IS NULL
       RETURNING id::text, last_active_at`,
      [tenantId, userId, sessionId]);
    return rows[0] ?? null;
  }
  async endSession(tenantId: string, userId: string, sessionId: string) {
    const r = await this.pool.query(
      `UPDATE dos.ui_workspace_sessions SET ended_at=NOW()
        WHERE tenant_id=$1 AND user_id=$2 AND id=$3::uuid AND ended_at IS NULL`,
      [tenantId, userId, sessionId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Window states ───────────────────────────────────────────
  async listWindows(tenantId: string, sessionId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, window_key, route_key, position, z_index,
              is_minimized, is_maximized, updated_at
         FROM dos.ui_window_states
        WHERE tenant_id=$1 AND workspace_session_id=$2::uuid
        ORDER BY z_index DESC, window_key`, [tenantId, sessionId]);
    return rows;
  }
  async upsertWindow(tenantId: string, sessionId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_window_states
        (tenant_id, workspace_session_id, window_key, route_key, position,
         z_index, is_minimized, is_maximized)
       VALUES ($1,$2::uuid,$3,$4,COALESCE($5::jsonb,'{}'::jsonb),
               COALESCE($6,0),COALESCE($7,FALSE),COALESCE($8,FALSE))
       ON CONFLICT (workspace_session_id, window_key) DO UPDATE
         SET route_key=EXCLUDED.route_key, position=EXCLUDED.position,
             z_index=EXCLUDED.z_index, is_minimized=EXCLUDED.is_minimized,
             is_maximized=EXCLUDED.is_maximized, updated_at=NOW()
       RETURNING id::text, window_key, z_index`,
      [tenantId, sessionId, body.window_key, body.route_key ?? null,
       body.position !== undefined ? JSON.stringify(body.position) : null,
       body.z_index ?? null, body.is_minimized ?? null, body.is_maximized ?? null]);
    return rows[0];
  }
  async deleteWindow(tenantId: string, windowId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_window_states WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, windowId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Panel states ────────────────────────────────────────────
  async listPanels(tenantId: string, sessionId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, panel_key, is_pinned, is_collapsed,
              width_px, position, metadata, updated_at
         FROM dos.ui_panel_states
        WHERE tenant_id=$1 AND workspace_session_id=$2::uuid
        ORDER BY panel_key`, [tenantId, sessionId]);
    return rows;
  }
  async upsertPanel(tenantId: string, sessionId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_panel_states
        (tenant_id, workspace_session_id, panel_key, is_pinned, is_collapsed,
         width_px, position, metadata)
       VALUES ($1,$2::uuid,$3,COALESCE($4,FALSE),COALESCE($5,FALSE),
               $6,$7,COALESCE($8::jsonb,'{}'::jsonb))
       ON CONFLICT (workspace_session_id, panel_key) DO UPDATE
         SET is_pinned=EXCLUDED.is_pinned, is_collapsed=EXCLUDED.is_collapsed,
             width_px=EXCLUDED.width_px, position=EXCLUDED.position,
             metadata=EXCLUDED.metadata, updated_at=NOW()
       RETURNING id::text, panel_key, is_pinned, is_collapsed`,
      [tenantId, sessionId, body.panel_key, body.is_pinned ?? null,
       body.is_collapsed ?? null, body.width_px ?? null, body.position ?? null,
       body.metadata !== undefined ? JSON.stringify(body.metadata) : null]);
    return rows[0];
  }

  // ── Tab states ──────────────────────────────────────────────
  async listTabs(tenantId: string, windowId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, tab_key, tab_order, is_active, is_pinned, route_key, metadata
         FROM dos.ui_tab_states
        WHERE tenant_id=$1 AND window_state_id=$2::uuid
        ORDER BY tab_order, tab_key`, [tenantId, windowId]);
    return rows;
  }
  async upsertTab(tenantId: string, windowId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_tab_states
        (tenant_id, window_state_id, tab_key, tab_order, is_active, is_pinned,
         route_key, metadata)
       VALUES ($1,$2::uuid,$3,COALESCE($4,0),COALESCE($5,FALSE),COALESCE($6,FALSE),
               $7,COALESCE($8::jsonb,'{}'::jsonb))
       ON CONFLICT (window_state_id, tab_key) DO UPDATE
         SET tab_order=EXCLUDED.tab_order, is_active=EXCLUDED.is_active,
             is_pinned=EXCLUDED.is_pinned, route_key=EXCLUDED.route_key,
             metadata=EXCLUDED.metadata, updated_at=NOW()
       RETURNING id::text, tab_key, tab_order, is_active`,
      [tenantId, windowId, body.tab_key, body.tab_order ?? null,
       body.is_active ?? null, body.is_pinned ?? null, body.route_key ?? null,
       body.metadata !== undefined ? JSON.stringify(body.metadata) : null]);
    return rows[0];
  }
  async deleteTab(tenantId: string, tabId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_tab_states WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, tabId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Split-view states ───────────────────────────────────────
  async listSplits(tenantId: string, windowId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, orientation::text AS orientation, split_ratio,
              pane_a_route_key, pane_b_route_key, metadata
         FROM dos.ui_split_view_states
        WHERE tenant_id=$1 AND window_state_id=$2::uuid
        ORDER BY id`, [tenantId, windowId]);
    return rows;
  }
  async upsertSplit(tenantId: string, windowId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_split_view_states
        (tenant_id, window_state_id, orientation, split_ratio,
         pane_a_route_key, pane_b_route_key, metadata)
       VALUES ($1,$2::uuid,$3::dos.ui_split_orientation_t,COALESCE($4,0.5),
               $5,$6,COALESCE($7::jsonb,'{}'::jsonb))
       RETURNING id::text, orientation::text AS orientation, split_ratio`,
      [tenantId, windowId, body.orientation, body.split_ratio ?? null,
       body.pane_a_route_key ?? null, body.pane_b_route_key ?? null,
       body.metadata !== undefined ? JSON.stringify(body.metadata) : null]);
    return rows[0];
  }
  async deleteSplit(tenantId: string, splitId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_split_view_states WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, splitId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Drag/drop audit ─────────────────────────────────────────
  async recordDragDrop(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_drag_drop_layout_events
        (tenant_id, user_id, source_kind, source_id, target_kind, target_id,
         payload, accepted)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::jsonb,'{}'::jsonb),$8)
       RETURNING id::text, occurred_at`,
      [tenantId, userId, body.source_kind, body.source_id ?? null,
       body.target_kind, body.target_id ?? null,
       body.payload !== undefined ? JSON.stringify(body.payload) : null, body.accepted]);
    return rows[0];
  }
  async listDragDrop(tenantId: string, userId: string, limit = 100) {
    const { rows } = await this.pool.query(
      `SELECT id::text, source_kind, source_id, target_kind, target_id,
              accepted, payload, occurred_at
         FROM dos.ui_drag_drop_layout_events
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY occurred_at DESC LIMIT $3`,
      [tenantId, userId, Math.min(limit, 500)]);
    return rows;
  }

  // ── Clipboard ───────────────────────────────────────────────
  async listClipboard(tenantId: string, userId: string, limit = 50) {
    const { rows } = await this.pool.query(
      `SELECT id::text, item_kind, payload, expires_at, created_at
         FROM dos.ui_clipboard_items
        WHERE tenant_id=$1 AND user_id=$2 AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT $3`,
      [tenantId, userId, Math.min(limit, 200)]);
    return rows;
  }
  async pushClipboard(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_clipboard_items
        (tenant_id, user_id, item_kind, payload, expires_at)
       VALUES ($1,$2,$3,COALESCE($4::jsonb,'{}'::jsonb),
               COALESCE($5::timestamptz, NOW() + INTERVAL '1 hour'))
       RETURNING id::text, item_kind, expires_at`,
      [tenantId, userId, body.item_kind,
       body.payload !== undefined ? JSON.stringify(body.payload) : null,
       body.expires_at ?? null]);
    return rows[0];
  }
  async clearClipboard(tenantId: string, userId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_clipboard_items WHERE tenant_id=$1 AND user_id=$2`,
      [tenantId, userId]);
    return r.rowCount ?? 0;
  }

  // ── Restore points ──────────────────────────────────────────
  async listRestorePoints(tenantId: string, userId: string, limit = 50) {
    const { rows } = await this.pool.query(
      `SELECT id::text, point_kind, created_at
         FROM dos.ui_workspace_restore_points
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY created_at DESC LIMIT $3`,
      [tenantId, userId, Math.min(limit, 200)]);
    return rows;
  }
  async createRestorePoint(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_workspace_restore_points
        (tenant_id, user_id, point_kind, state_payload)
       VALUES ($1,$2,$3,COALESCE($4::jsonb,'{}'::jsonb))
       RETURNING id::text, point_kind, created_at`,
      [tenantId, userId, body.point_kind,
       body.state_payload !== undefined ? JSON.stringify(body.state_payload) : null]);
    return rows[0];
  }
  async getRestorePoint(tenantId: string, userId: string, pointId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, point_kind, state_payload, created_at
         FROM dos.ui_workspace_restore_points
        WHERE tenant_id=$1 AND user_id=$2 AND id=$3::uuid LIMIT 1`,
      [tenantId, userId, pointId]);
    return rows[0] ?? null;
  }
  async deleteRestorePoint(tenantId: string, userId: string, pointId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_workspace_restore_points
        WHERE tenant_id=$1 AND user_id=$2 AND id=$3::uuid`,
      [tenantId, userId, pointId]);
    return (r.rowCount ?? 0) > 0;
  }
}
