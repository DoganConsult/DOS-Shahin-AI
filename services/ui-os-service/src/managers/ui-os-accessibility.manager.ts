import type { DbPool } from '../db.js';

/**
 * Wave 11i-§13 Accessibility/Device — manager covering 7 §13 tables (migration
 * 20260502_0118): accessibility_preferences, reduced_motion_preferences,
 * contrast_preferences, font_scale_preferences, device_preferences,
 * device_sessions, viewport_profiles.
 */
export class UiOsAccessibilityManager {
  constructor(private readonly pool: DbPool) {}

  // ── Accessibility prefs (composite per-user) ────────────────
  async getAccessibility(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT screen_reader_optimized, keyboard_only, caption_required, tab_order_strict
         FROM dos.ui_accessibility_preferences
        WHERE tenant_id=$1 AND user_id=$2 LIMIT 1`, [tenantId, userId]);
    return rows[0] ?? null;
  }
  async upsertAccessibility(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_accessibility_preferences
        (tenant_id, user_id, screen_reader_optimized, keyboard_only,
         caption_required, tab_order_strict)
       VALUES ($1,$2,COALESCE($3,FALSE),COALESCE($4,FALSE),COALESCE($5,FALSE),COALESCE($6,FALSE))
       ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET screen_reader_optimized=EXCLUDED.screen_reader_optimized,
             keyboard_only=EXCLUDED.keyboard_only,
             caption_required=EXCLUDED.caption_required,
             tab_order_strict=EXCLUDED.tab_order_strict, updated_at=NOW()
       RETURNING id::text, screen_reader_optimized, keyboard_only,
                 caption_required, tab_order_strict`,
      [tenantId, userId, body.screen_reader_optimized ?? null,
       body.keyboard_only ?? null, body.caption_required ?? null, body.tab_order_strict ?? null]);
    return rows[0];
  }

  // ── Reduced motion ──────────────────────────────────────────
  async getReducedMotion(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT reduce_motion, disable_parallax, disable_autoplay
         FROM dos.ui_reduced_motion_preferences
        WHERE tenant_id=$1 AND user_id=$2 LIMIT 1`, [tenantId, userId]);
    return rows[0] ?? null;
  }
  async upsertReducedMotion(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_reduced_motion_preferences
        (tenant_id, user_id, reduce_motion, disable_parallax, disable_autoplay)
       VALUES ($1,$2,COALESCE($3,FALSE),COALESCE($4,FALSE),COALESCE($5,FALSE))
       ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET reduce_motion=EXCLUDED.reduce_motion,
             disable_parallax=EXCLUDED.disable_parallax,
             disable_autoplay=EXCLUDED.disable_autoplay, updated_at=NOW()
       RETURNING id::text, reduce_motion, disable_parallax, disable_autoplay`,
      [tenantId, userId, body.reduce_motion ?? null,
       body.disable_parallax ?? null, body.disable_autoplay ?? null]);
    return rows[0];
  }

  // ── Contrast ────────────────────────────────────────────────
  async getContrast(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT contrast_mode::text AS contrast_mode
         FROM dos.ui_contrast_preferences
        WHERE tenant_id=$1 AND user_id=$2 LIMIT 1`, [tenantId, userId]);
    return rows[0] ?? null;
  }
  async upsertContrast(tenantId: string, userId: string, mode: string) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_contrast_preferences (tenant_id, user_id, contrast_mode)
       VALUES ($1,$2,$3::dos.ui_contrast_mode_t)
       ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET contrast_mode=EXCLUDED.contrast_mode, updated_at=NOW()
       RETURNING id::text, contrast_mode::text AS contrast_mode`,
      [tenantId, userId, mode]);
    return rows[0];
  }

  // ── Font scale ──────────────────────────────────────────────
  async getFontScale(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT scale_percent FROM dos.ui_font_scale_preferences
        WHERE tenant_id=$1 AND user_id=$2 LIMIT 1`, [tenantId, userId]);
    return rows[0] ?? null;
  }
  async upsertFontScale(tenantId: string, userId: string, scalePercent: number) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_font_scale_preferences (tenant_id, user_id, scale_percent)
       VALUES ($1,$2,$3)
       ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET scale_percent=EXCLUDED.scale_percent, updated_at=NOW()
       RETURNING id::text, scale_percent`,
      [tenantId, userId, scalePercent]);
    return rows[0];
  }

  // ── Device prefs (per device kind) ──────────────────────────
  async listDevicePreferences(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, device_kind::text AS device_kind, prefers_compact, prefers_dark
         FROM dos.ui_device_preferences
        WHERE tenant_id=$1 AND user_id=$2 ORDER BY device_kind`,
      [tenantId, userId]);
    return rows;
  }
  async upsertDevicePreference(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_device_preferences
        (tenant_id, user_id, device_kind, prefers_compact, prefers_dark)
       VALUES ($1,$2,$3::dos.ui_device_kind_t,COALESCE($4,FALSE),COALESCE($5,FALSE))
       ON CONFLICT (tenant_id, user_id, device_kind) DO UPDATE
         SET prefers_compact=EXCLUDED.prefers_compact,
             prefers_dark=EXCLUDED.prefers_dark, updated_at=NOW()
       RETURNING id::text, device_kind::text AS device_kind, prefers_compact, prefers_dark`,
      [tenantId, userId, body.device_kind, body.prefers_compact ?? null, body.prefers_dark ?? null]);
    return rows[0];
  }

  // ── Device sessions ─────────────────────────────────────────
  async listDeviceSessions(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, device_id, device_kind::text AS device_kind,
              user_agent, ip_hash, first_seen_at, last_seen_at
         FROM dos.ui_device_sessions
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY last_seen_at DESC`, [tenantId, userId]);
    return rows;
  }
  async touchDeviceSession(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_device_sessions
        (tenant_id, user_id, device_id, device_kind, user_agent, ip_hash)
       VALUES ($1,$2,$3,$4::dos.ui_device_kind_t,$5,$6)
       ON CONFLICT (tenant_id, device_id) DO UPDATE
         SET user_id=EXCLUDED.user_id, device_kind=EXCLUDED.device_kind,
             user_agent=EXCLUDED.user_agent, ip_hash=EXCLUDED.ip_hash,
             last_seen_at=NOW()
       RETURNING id::text, device_id, last_seen_at`,
      [tenantId, userId, body.device_id, body.device_kind ?? null,
       body.user_agent ?? null, body.ip_hash ?? null]);
    return rows[0];
  }
  async revokeDeviceSession(tenantId: string, userId: string, sessionId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_device_sessions
        WHERE tenant_id=$1 AND user_id=$2 AND id=$3::uuid`,
      [tenantId, userId, sessionId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Viewport profiles ───────────────────────────────────────
  async listViewportProfiles(tenantId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, profile_code, breakpoint_kind::text AS breakpoint_kind,
              min_width_px, max_width_px, is_active
         FROM dos.ui_viewport_profiles
        WHERE tenant_id=$1 ORDER BY min_width_px`, [tenantId]);
    return rows;
  }
  async upsertViewportProfile(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_viewport_profiles
        (tenant_id, profile_code, breakpoint_kind, min_width_px, max_width_px, is_active)
       VALUES ($1,$2,$3::dos.ui_viewport_breakpoint_t,$4,$5,COALESCE($6,TRUE))
       ON CONFLICT (tenant_id, profile_code) DO UPDATE
         SET breakpoint_kind=EXCLUDED.breakpoint_kind,
             min_width_px=EXCLUDED.min_width_px,
             max_width_px=EXCLUDED.max_width_px,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, profile_code, breakpoint_kind::text AS breakpoint_kind`,
      [tenantId, body.profile_code, body.breakpoint_kind, body.min_width_px,
       body.max_width_px ?? null, body.is_active ?? null]);
    return rows[0];
  }
  async deleteViewportProfile(tenantId: string, profileId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_viewport_profiles WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, profileId]);
    return (r.rowCount ?? 0) > 0;
  }
}
