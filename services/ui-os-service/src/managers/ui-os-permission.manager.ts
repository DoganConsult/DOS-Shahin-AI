import type { DbPool } from '../db.js';

/**
 * Wave 11k-§15 Visibility/Permission — manager covering 7 §15 tables
 * (migrations 0121+0122): visibility_rules, permission_bindings,
 * policy_evaluation_log, denied_render_log, role_layout_assignments,
 * role_dashboard_assignments, role_navigation_assignments.
 */
export class UiOsPermissionManager {
  constructor(private readonly pool: DbPool) {}

  // ── Visibility rules ────────────────────────────────────────
  async listVisibilityRules(tenantId: string, opts: { targetKind?: string | null; targetId?: string | null }) {
    const { rows } = await this.pool.query(
      `SELECT id::text, target_kind::text AS target_kind, target_id,
              rule_kind::text AS rule_kind, rule_payload, effect::text AS effect,
              priority, is_active
         FROM dos.ui_visibility_rules
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR target_kind::text=$2)
          AND ($3::text IS NULL OR target_id=$3)
        ORDER BY target_kind, target_id, priority`,
      [tenantId, opts.targetKind ?? null, opts.targetId ?? null]);
    return rows;
  }
  async createVisibilityRule(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_visibility_rules
        (tenant_id, target_kind, target_id, rule_kind, rule_payload,
         effect, priority, is_active)
       VALUES ($1,$2::dos.ui_target_kind_t,$3,$4::dos.ui_visibility_rule_kind_t,
               COALESCE($5::jsonb,'{}'::jsonb),
               COALESCE($6,'show')::dos.ui_visibility_effect_t,
               COALESCE($7,100),COALESCE($8,TRUE))
       RETURNING id::text, target_kind::text AS target_kind, target_id,
                 rule_kind::text AS rule_kind, effect::text AS effect, priority`,
      [tenantId, body.target_kind, body.target_id, body.rule_kind,
       body.rule_payload !== undefined ? JSON.stringify(body.rule_payload) : null,
       body.effect ?? null, body.priority ?? null, body.is_active ?? null]);
    return rows[0];
  }
  async updateVisibilityRule(tenantId: string, ruleId: string, body: any) {
    const { rows } = await this.pool.query(
      `UPDATE dos.ui_visibility_rules
          SET rule_kind=COALESCE($3::dos.ui_visibility_rule_kind_t, rule_kind),
              rule_payload=COALESCE($4::jsonb, rule_payload),
              effect=COALESCE($5::dos.ui_visibility_effect_t, effect),
              priority=COALESCE($6, priority),
              is_active=COALESCE($7, is_active),
              updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid
       RETURNING id::text, target_kind::text AS target_kind, target_id,
                 rule_kind::text AS rule_kind, effect::text AS effect, priority`,
      [tenantId, ruleId, body.rule_kind ?? null,
       body.rule_payload !== undefined ? JSON.stringify(body.rule_payload) : null,
       body.effect ?? null, body.priority ?? null, body.is_active ?? null]);
    return rows[0] ?? null;
  }
  async deleteVisibilityRule(tenantId: string, ruleId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_visibility_rules WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, ruleId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Permission bindings ─────────────────────────────────────
  async listPermissionBindings(tenantId: string, opts: { targetKind?: string | null; targetId?: string | null }) {
    const { rows } = await this.pool.query(
      `SELECT id::text, target_kind::text AS target_kind, target_id,
              permission_code, effect::text AS effect, is_active
         FROM dos.ui_permission_bindings
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR target_kind::text=$2)
          AND ($3::text IS NULL OR target_id=$3)
        ORDER BY target_kind, target_id, permission_code`,
      [tenantId, opts.targetKind ?? null, opts.targetId ?? null]);
    return rows;
  }
  async upsertPermissionBinding(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_permission_bindings
        (tenant_id, target_kind, target_id, permission_code, effect, is_active)
       VALUES ($1,$2::dos.ui_target_kind_t,$3,$4,
               COALESCE($5,'allow')::dos.ui_perm_effect_t,COALESCE($6,TRUE))
       ON CONFLICT (tenant_id, target_kind, target_id, permission_code) DO UPDATE
         SET effect=EXCLUDED.effect, is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, target_kind::text AS target_kind, target_id,
                 permission_code, effect::text AS effect`,
      [tenantId, body.target_kind, body.target_id, body.permission_code,
       body.effect ?? null, body.is_active ?? null]);
    return rows[0];
  }
  async deletePermissionBinding(tenantId: string, bindingId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_permission_bindings WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, bindingId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Policy evaluation log ───────────────────────────────────
  async logPolicyEvaluation(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_policy_evaluation_log
        (tenant_id, user_id, policy_kind, target_kind, target_id, effect, reason_code)
       VALUES ($1,$2,$3,$4::dos.ui_target_kind_t,$5,
               $6::dos.ui_perm_effect_t,$7)
       RETURNING id::text, evaluated_at`,
      [tenantId, userId, body.policy_kind, body.target_kind, body.target_id,
       body.effect, body.reason_code ?? null]);
    return rows[0];
  }
  async listPolicyEvaluations(tenantId: string, opts: { userId?: string | null; targetKind?: string | null; targetId?: string | null; limit?: number }) {
    const { rows } = await this.pool.query(
      `SELECT id::text, user_id, policy_kind, target_kind::text AS target_kind,
              target_id, effect::text AS effect, reason_code, evaluated_at
         FROM dos.ui_policy_evaluation_log
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR user_id=$2)
          AND ($3::text IS NULL OR target_kind::text=$3)
          AND ($4::text IS NULL OR target_id=$4)
        ORDER BY evaluated_at DESC LIMIT $5`,
      [tenantId, opts.userId ?? null, opts.targetKind ?? null,
       opts.targetId ?? null, Math.min(opts.limit ?? 200, 500)]);
    return rows;
  }

  // ── Denied render log ───────────────────────────────────────
  async logDeniedRender(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_denied_render_log
        (tenant_id, user_id, target_kind, target_id, reason_code)
       VALUES ($1,$2,$3::dos.ui_target_kind_t,$4,$5)
       RETURNING id::text, denied_at`,
      [tenantId, userId, body.target_kind, body.target_id, body.reason_code]);
    return rows[0];
  }
  async listDeniedRenders(tenantId: string, opts: { userId?: string | null; limit?: number }) {
    const { rows } = await this.pool.query(
      `SELECT id::text, user_id, target_kind::text AS target_kind, target_id,
              reason_code, denied_at
         FROM dos.ui_denied_render_log
        WHERE tenant_id=$1 AND ($2::text IS NULL OR user_id=$2)
        ORDER BY denied_at DESC LIMIT $3`,
      [tenantId, opts.userId ?? null, Math.min(opts.limit ?? 200, 500)]);
    return rows;
  }

  // ── Role → layout assignments ───────────────────────────────
  async listRoleLayoutAssignments(tenantId: string, roleCode?: string | null) {
    const { rows } = await this.pool.query(
      `SELECT id::text, role_code, layout_template_id::text AS layout_template_id,
              is_default, is_active
         FROM dos.ui_role_layout_assignments
        WHERE tenant_id=$1 AND ($2::text IS NULL OR role_code=$2)
        ORDER BY role_code`, [tenantId, roleCode ?? null]);
    return rows;
  }
  async upsertRoleLayoutAssignment(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_role_layout_assignments
        (tenant_id, role_code, layout_template_id, is_default, is_active)
       VALUES ($1,$2,$3::uuid,COALESCE($4,FALSE),COALESCE($5,TRUE))
       ON CONFLICT (tenant_id, role_code, layout_template_id) DO UPDATE
         SET is_default=EXCLUDED.is_default,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, role_code, layout_template_id::text AS layout_template_id`,
      [tenantId, body.role_code, body.layout_template_id,
       body.is_default ?? null, body.is_active ?? null]);
    return rows[0];
  }
  async deleteRoleLayoutAssignment(tenantId: string, assignmentId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_role_layout_assignments WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, assignmentId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Role → dashboard assignments ────────────────────────────
  async listRoleDashboardAssignments(tenantId: string, roleCode?: string | null) {
    const { rows } = await this.pool.query(
      `SELECT id::text, role_code, dashboard_id::text AS dashboard_id,
              is_default, is_active
         FROM dos.ui_role_dashboard_assignments
        WHERE tenant_id=$1 AND ($2::text IS NULL OR role_code=$2)
        ORDER BY role_code`, [tenantId, roleCode ?? null]);
    return rows;
  }
  async upsertRoleDashboardAssignment(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_role_dashboard_assignments
        (tenant_id, role_code, dashboard_id, is_default, is_active)
       VALUES ($1,$2,$3::uuid,COALESCE($4,FALSE),COALESCE($5,TRUE))
       ON CONFLICT (tenant_id, role_code, dashboard_id) DO UPDATE
         SET is_default=EXCLUDED.is_default,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, role_code, dashboard_id::text AS dashboard_id`,
      [tenantId, body.role_code, body.dashboard_id,
       body.is_default ?? null, body.is_active ?? null]);
    return rows[0];
  }
  async deleteRoleDashboardAssignment(tenantId: string, assignmentId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_role_dashboard_assignments WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, assignmentId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Role → navigation assignments ───────────────────────────
  async listRoleNavigationAssignments(tenantId: string, roleCode?: string | null) {
    const { rows } = await this.pool.query(
      `SELECT id::text, role_code, nav_node_key, effect::text AS effect, is_active
         FROM dos.ui_role_navigation_assignments
        WHERE tenant_id=$1 AND ($2::text IS NULL OR role_code=$2)
        ORDER BY role_code, nav_node_key`, [tenantId, roleCode ?? null]);
    return rows;
  }
  async upsertRoleNavigationAssignment(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_role_navigation_assignments
        (tenant_id, role_code, nav_node_key, effect, is_active)
       VALUES ($1,$2,$3,COALESCE($4,'allow')::dos.ui_perm_effect_t,COALESCE($5,TRUE))
       ON CONFLICT (tenant_id, role_code, nav_node_key) DO UPDATE
         SET effect=EXCLUDED.effect,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, role_code, nav_node_key, effect::text AS effect`,
      [tenantId, body.role_code, body.nav_node_key,
       body.effect ?? null, body.is_active ?? null]);
    return rows[0];
  }
  async deleteRoleNavigationAssignment(tenantId: string, assignmentId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_role_navigation_assignments WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, assignmentId]);
    return (r.rowCount ?? 0) > 0;
  }
}
