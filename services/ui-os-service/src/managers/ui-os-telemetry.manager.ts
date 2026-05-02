import type { DbPool } from '../db.js';
import { createHash } from 'node:crypto';

/**
 * Wave 11n-§18 Telemetry — manager covering 9 §18 tables (migrations
 * 0126+0127): page_view, click, command, render_performance, error,
 * widget_usage, search, funnel, retention_snapshots.
 *
 * Privacy: caller passes raw user_id; we hash before insert. Never
 * persist raw queries/stacks — caller pre-hashes those when relevant.
 */
function hashUser(tenantId: string, userId: string): string {
  return createHash('sha256').update(`${tenantId}:${userId}`).digest('hex');
}

export class UiOsTelemetryManager {
  constructor(private readonly pool: DbPool) {}

  // ── Page view ───────────────────────────────────────────────
  async recordPageView(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_page_view_events
        (tenant_id, user_id_hash, route_key, referrer_route_key, duration_ms, device_kind)
       VALUES ($1,$2,$3,$4,$5,$6::dos.ui_device_kind_t)
       RETURNING id::text, occurred_at`,
      [tenantId, hashUser(tenantId, userId), body.route_key,
       body.referrer_route_key ?? null, body.duration_ms ?? null, body.device_kind ?? null]);
    return rows[0];
  }
  async pageViewStats(tenantId: string, opts: { routeKey?: string | null; sinceHours?: number }) {
    const { rows } = await this.pool.query(
      `SELECT route_key, COUNT(*)::int AS views, COUNT(DISTINCT user_id_hash)::int AS unique_users,
              COALESCE(AVG(duration_ms),0)::int AS avg_duration_ms
         FROM dos.ui_page_view_events
        WHERE tenant_id=$1
          AND occurred_at > NOW() - ($2::int || ' hours')::interval
          AND ($3::text IS NULL OR route_key=$3)
        GROUP BY route_key ORDER BY views DESC LIMIT 100`,
      [tenantId, opts.sinceHours ?? 24, opts.routeKey ?? null]);
    return rows;
  }

  // ── Click ───────────────────────────────────────────────────
  async recordClick(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_click_events
        (tenant_id, user_id_hash, target_kind, target_id, action_code, route_key)
       VALUES ($1,$2,$3::dos.ui_target_kind_t,$4,$5,$6)
       RETURNING id::text, occurred_at`,
      [tenantId, hashUser(tenantId, userId), body.target_kind,
       body.target_id ?? null, body.action_code ?? null, body.route_key ?? null]);
    return rows[0];
  }
  async clickStats(tenantId: string, opts: { targetKind?: string | null; sinceHours?: number }) {
    const { rows } = await this.pool.query(
      `SELECT target_kind::text AS target_kind, target_id, action_code,
              COUNT(*)::int AS clicks, COUNT(DISTINCT user_id_hash)::int AS unique_users
         FROM dos.ui_click_events
        WHERE tenant_id=$1
          AND occurred_at > NOW() - ($2::int || ' hours')::interval
          AND ($3::text IS NULL OR target_kind::text=$3)
        GROUP BY target_kind, target_id, action_code
        ORDER BY clicks DESC LIMIT 100`,
      [tenantId, opts.sinceHours ?? 24, opts.targetKind ?? null]);
    return rows;
  }

  // ── Command ─────────────────────────────────────────────────
  async recordCommand(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_command_events
        (tenant_id, user_id_hash, command_key, surface, result)
       VALUES ($1,$2,$3,$4::dos.ui_command_surface_t,$5)
       RETURNING id::text, occurred_at`,
      [tenantId, hashUser(tenantId, userId), body.command_key,
       body.surface, body.result ?? null]);
    return rows[0];
  }
  async commandStats(tenantId: string, sinceHours = 24) {
    const { rows } = await this.pool.query(
      `SELECT command_key, surface::text AS surface, result, COUNT(*)::int AS executions
         FROM dos.ui_command_events
        WHERE tenant_id=$1 AND occurred_at > NOW() - ($2::int || ' hours')::interval
        GROUP BY command_key, surface, result
        ORDER BY executions DESC LIMIT 100`,
      [tenantId, sinceHours]);
    return rows;
  }

  // ── Render performance ──────────────────────────────────────
  async recordRenderPerf(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_render_performance_events
        (tenant_id, user_id_hash, route_key, lcp_ms, inp_ms, cls, tbt_ms, fcp_ms, ttfb_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id::text, occurred_at`,
      [tenantId, hashUser(tenantId, userId), body.route_key,
       body.lcp_ms ?? null, body.inp_ms ?? null, body.cls ?? null,
       body.tbt_ms ?? null, body.fcp_ms ?? null, body.ttfb_ms ?? null]);
    return rows[0];
  }
  async renderPerfStats(tenantId: string, opts: { routeKey?: string | null; sinceHours?: number }) {
    const { rows } = await this.pool.query(
      `SELECT route_key, COUNT(*)::int AS samples,
              percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_ms)::int AS lcp_p75_ms,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY lcp_ms)::int AS lcp_p95_ms,
              percentile_cont(0.75) WITHIN GROUP (ORDER BY inp_ms)::int AS inp_p75_ms,
              percentile_cont(0.75) WITHIN GROUP (ORDER BY cls)::numeric(5,3) AS cls_p75
         FROM dos.ui_render_performance_events
        WHERE tenant_id=$1
          AND occurred_at > NOW() - ($2::int || ' hours')::interval
          AND ($3::text IS NULL OR route_key=$3)
        GROUP BY route_key ORDER BY samples DESC LIMIT 100`,
      [tenantId, opts.sinceHours ?? 24, opts.routeKey ?? null]);
    return rows;
  }

  // ── Error ───────────────────────────────────────────────────
  async recordError(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_error_events
        (tenant_id, user_id_hash, route_key, error_code, error_kind, stack_hash)
       VALUES ($1,$2,$3,$4,$5::dos.ui_error_kind_t,$6)
       RETURNING id::text, occurred_at`,
      [tenantId, hashUser(tenantId, userId), body.route_key ?? null,
       body.error_code, body.error_kind, body.stack_hash ?? null]);
    return rows[0];
  }
  async errorStats(tenantId: string, opts: { errorKind?: string | null; sinceHours?: number }) {
    const { rows } = await this.pool.query(
      `SELECT error_code, error_kind::text AS error_kind,
              COUNT(*)::int AS occurrences,
              COUNT(DISTINCT user_id_hash)::int AS users_affected
         FROM dos.ui_error_events
        WHERE tenant_id=$1
          AND occurred_at > NOW() - ($2::int || ' hours')::interval
          AND ($3::text IS NULL OR error_kind::text=$3)
        GROUP BY error_code, error_kind ORDER BY occurrences DESC LIMIT 100`,
      [tenantId, opts.sinceHours ?? 24, opts.errorKind ?? null]);
    return rows;
  }

  // ── Widget usage ────────────────────────────────────────────
  async recordWidgetUsage(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_widget_usage_events
        (tenant_id, user_id_hash, widget_instance_id, interaction, duration_ms)
       VALUES ($1,$2,$3::uuid,$4,$5)
       RETURNING id::text, occurred_at`,
      [tenantId, hashUser(tenantId, userId), body.widget_instance_id,
       body.interaction, body.duration_ms ?? null]);
    return rows[0];
  }
  async widgetUsageStats(tenantId: string, sinceHours = 24) {
    const { rows } = await this.pool.query(
      `SELECT widget_instance_id::text AS widget_instance_id, interaction,
              COUNT(*)::int AS interactions,
              COUNT(DISTINCT user_id_hash)::int AS unique_users,
              COALESCE(AVG(duration_ms),0)::int AS avg_duration_ms
         FROM dos.ui_widget_usage_events
        WHERE tenant_id=$1 AND occurred_at > NOW() - ($2::int || ' hours')::interval
        GROUP BY widget_instance_id, interaction
        ORDER BY interactions DESC LIMIT 200`,
      [tenantId, sinceHours]);
    return rows;
  }

  // ── Search events ───────────────────────────────────────────
  async recordSearchEvent(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_search_events
        (tenant_id, user_id_hash, scope_code, query_hash, result_count, clicked_position)
       VALUES ($1,$2,$3,$4,COALESCE($5,0),$6)
       RETURNING id::text, occurred_at`,
      [tenantId, hashUser(tenantId, userId), body.scope_code,
       body.query_hash, body.result_count ?? null, body.clicked_position ?? null]);
    return rows[0];
  }
  async searchStats(tenantId: string, sinceHours = 24) {
    const { rows } = await this.pool.query(
      `SELECT scope_code, COUNT(*)::int AS searches,
              COUNT(DISTINCT user_id_hash)::int AS unique_users,
              COUNT(*) FILTER (WHERE clicked_position IS NOT NULL)::int AS with_clicks,
              COALESCE(AVG(result_count),0)::int AS avg_results
         FROM dos.ui_search_events
        WHERE tenant_id=$1 AND occurred_at > NOW() - ($2::int || ' hours')::interval
        GROUP BY scope_code ORDER BY searches DESC LIMIT 100`,
      [tenantId, sinceHours]);
    return rows;
  }

  // ── Funnel events ───────────────────────────────────────────
  async recordFunnelStep(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_funnel_events
        (tenant_id, user_id_hash, funnel_code, step_code, step_order)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id::text, occurred_at`,
      [tenantId, hashUser(tenantId, userId), body.funnel_code,
       body.step_code, body.step_order]);
    return rows[0];
  }
  async funnelStats(tenantId: string, funnelCode: string, sinceHours = 168) {
    const { rows } = await this.pool.query(
      `SELECT step_code, step_order,
              COUNT(DISTINCT user_id_hash)::int AS unique_users
         FROM dos.ui_funnel_events
        WHERE tenant_id=$1 AND funnel_code=$2
          AND occurred_at > NOW() - ($3::int || ' hours')::interval
        GROUP BY step_code, step_order ORDER BY step_order`,
      [tenantId, funnelCode, sinceHours]);
    return rows;
  }

  // ── Retention snapshots ─────────────────────────────────────
  async recordRetention(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_retention_snapshots
        (tenant_id, cohort_code, day_index, active_user_count)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (tenant_id, cohort_code, day_index, snapshot_at) DO NOTHING
       RETURNING id::text, snapshot_at`,
      [tenantId, body.cohort_code, body.day_index, body.active_user_count]);
    return rows[0] ?? null;
  }
  async retentionMatrix(tenantId: string, cohortCode?: string | null) {
    const { rows } = await this.pool.query(
      `SELECT cohort_code, day_index, active_user_count, snapshot_at
         FROM dos.ui_retention_snapshots
        WHERE tenant_id=$1 AND ($2::text IS NULL OR cohort_code=$2)
        ORDER BY cohort_code, day_index`,
      [tenantId, cohortCode ?? null]);
    return rows;
  }
}
