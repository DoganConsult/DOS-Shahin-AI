import type { DbPool } from '../db.js';

/**
 * Wave 11m-§17 Feature flags / experiments — manager covering 7 §17 tables
 * (migration 0125): feature_flags, feature_flag_assignments, experiments,
 * experiment_variants, experiment_assignments, rollout_rules, kill_switches.
 */
export class UiOsFlagsManager {
  constructor(private readonly pool: DbPool) {}

  // ── Feature flags ───────────────────────────────────────────
  async listFlags(tenantId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, flag_code, description_key, default_value, is_active
         FROM dos.ui_feature_flags
        WHERE tenant_id=$1 ORDER BY flag_code`, [tenantId]);
    return rows;
  }
  async getFlag(tenantId: string, flagId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, flag_code, description_key, default_value, is_active,
              created_by, updated_by, created_at, updated_at
         FROM dos.ui_feature_flags
        WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1`,
      [tenantId, flagId]);
    return rows[0] ?? null;
  }
  async upsertFlag(tenantId: string, actorId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_feature_flags
        (tenant_id, flag_code, description_key, default_value, is_active,
         created_by, updated_by)
       VALUES ($1,$2,$3,COALESCE($4::jsonb,'false'::jsonb),COALESCE($5,TRUE),$6,$6)
       ON CONFLICT (tenant_id, flag_code) DO UPDATE
         SET description_key=EXCLUDED.description_key,
             default_value=EXCLUDED.default_value,
             is_active=EXCLUDED.is_active,
             updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, flag_code, default_value, is_active`,
      [tenantId, body.flag_code, body.description_key ?? null,
       body.default_value !== undefined ? JSON.stringify(body.default_value) : null,
       body.is_active ?? null, actorId]);
    return rows[0];
  }
  async deleteFlag(tenantId: string, flagId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_feature_flags WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, flagId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Flag assignments ────────────────────────────────────────
  async listFlagAssignments(tenantId: string, flagId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, target_kind::text AS target_kind, target_id, value
         FROM dos.ui_feature_flag_assignments
        WHERE tenant_id=$1 AND flag_id=$2::uuid
        ORDER BY target_kind, target_id`, [tenantId, flagId]);
    return rows;
  }
  async upsertFlagAssignment(tenantId: string, flagId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_feature_flag_assignments
        (tenant_id, flag_id, target_kind, target_id, value)
       VALUES ($1,$2::uuid,$3::dos.ui_flag_target_kind_t,$4,$5::jsonb)
       ON CONFLICT (flag_id, target_kind, target_id) DO UPDATE
         SET value=EXCLUDED.value, updated_at=NOW()
       RETURNING id::text, target_kind::text AS target_kind, target_id, value`,
      [tenantId, flagId, body.target_kind, body.target_id, JSON.stringify(body.value)]);
    return rows[0];
  }
  async deleteFlagAssignment(tenantId: string, assignmentId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_feature_flag_assignments WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, assignmentId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Experiments ─────────────────────────────────────────────
  // 6NF — metric_keys live in dos.ui_experiment_metrics (migration 0133).
  async listExperiments(tenantId: string, activeOnly = false) {
    const { rows } = await this.pool.query(
      `SELECT e.id::text, e.experiment_code, e.hypothesis,
              COALESCE(
                (SELECT ARRAY_AGG(m.metric_key ORDER BY m.metric_key)
                   FROM dos.ui_experiment_metrics m WHERE m.experiment_id = e.id),
                ARRAY[]::TEXT[]
              ) AS metric_keys,
              e.started_at, e.ended_at, e.is_active
         FROM dos.ui_experiments e
        WHERE e.tenant_id=$1 AND ($2::boolean IS FALSE OR e.is_active=TRUE)
        ORDER BY e.experiment_code`, [tenantId, activeOnly]);
    return rows;
  }
  async getExperiment(tenantId: string, experimentId: string) {
    const { rows } = await this.pool.query(
      `SELECT e.id::text, e.experiment_code, e.hypothesis,
              COALESCE(
                (SELECT ARRAY_AGG(m.metric_key ORDER BY m.metric_key)
                   FROM dos.ui_experiment_metrics m WHERE m.experiment_id = e.id),
                ARRAY[]::TEXT[]
              ) AS metric_keys,
              e.started_at, e.ended_at, e.is_active, e.created_at, e.updated_at
         FROM dos.ui_experiments e
        WHERE e.tenant_id=$1 AND e.id=$2::uuid LIMIT 1`,
      [tenantId, experimentId]);
    return rows[0] ?? null;
  }
  async upsertExperiment(tenantId: string, body: any) {
    const client = await this.pool.connect();
    let row: any;
    try {
      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO dos.ui_experiments
          (tenant_id, experiment_code, hypothesis, started_at, ended_at, is_active)
         VALUES ($1,$2,$3,$4::timestamptz,$5::timestamptz,COALESCE($6,TRUE))
         ON CONFLICT (tenant_id, experiment_code) DO UPDATE
           SET hypothesis=EXCLUDED.hypothesis,
               started_at=EXCLUDED.started_at, ended_at=EXCLUDED.ended_at,
               is_active=EXCLUDED.is_active, updated_at=NOW()
         RETURNING id::text, experiment_code, is_active`,
        [tenantId, body.experiment_code, body.hypothesis ?? null,
         body.started_at ?? null, body.ended_at ?? null, body.is_active ?? null]);
      row = ins.rows[0];
      if (body.metric_keys !== undefined && body.metric_keys !== null) {
        await client.query(
          `DELETE FROM dos.ui_experiment_metrics WHERE experiment_id = $1::uuid`,
          [row.id],
        );
        if (Array.isArray(body.metric_keys) && body.metric_keys.length > 0) {
          await client.query(
            `INSERT INTO dos.ui_experiment_metrics (experiment_id, metric_key)
             SELECT $1::uuid, UNNEST($2::text[]) ON CONFLICT DO NOTHING`,
            [row.id, body.metric_keys],
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
    return row;
  }
  async deleteExperiment(tenantId: string, experimentId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_experiments WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, experimentId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Experiment variants ─────────────────────────────────────
  async listVariants(tenantId: string, experimentId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, variant_code, description_key, traffic_pct,
              is_control, is_active
         FROM dos.ui_experiment_variants
        WHERE tenant_id=$1 AND experiment_id=$2::uuid
        ORDER BY variant_code`, [tenantId, experimentId]);
    return rows;
  }
  async upsertVariant(tenantId: string, experimentId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_experiment_variants
        (tenant_id, experiment_id, variant_code, description_key,
         traffic_pct, is_control, is_active)
       VALUES ($1,$2::uuid,$3,$4,COALESCE($5,0),COALESCE($6,FALSE),COALESCE($7,TRUE))
       ON CONFLICT (experiment_id, variant_code) DO UPDATE
         SET description_key=EXCLUDED.description_key,
             traffic_pct=EXCLUDED.traffic_pct,
             is_control=EXCLUDED.is_control,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, variant_code, traffic_pct, is_control`,
      [tenantId, experimentId, body.variant_code, body.description_key ?? null,
       body.traffic_pct ?? null, body.is_control ?? null, body.is_active ?? null]);
    return rows[0];
  }
  async deleteVariant(tenantId: string, variantId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_experiment_variants WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, variantId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Experiment assignments ──────────────────────────────────
  async getExperimentAssignment(tenantId: string, experimentId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT a.id::text, a.user_id, a.variant_id::text AS variant_id,
              v.variant_code, a.assigned_at
         FROM dos.ui_experiment_assignments a
         JOIN dos.ui_experiment_variants v ON v.id = a.variant_id
        WHERE a.tenant_id=$1 AND a.experiment_id=$2::uuid AND a.user_id=$3 LIMIT 1`,
      [tenantId, experimentId, userId]);
    return rows[0] ?? null;
  }
  async upsertExperimentAssignment(tenantId: string, experimentId: string, userId: string, variantId: string) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_experiment_assignments
        (tenant_id, experiment_id, user_id, variant_id)
       VALUES ($1,$2::uuid,$3,$4::uuid)
       ON CONFLICT (experiment_id, user_id) DO UPDATE
         SET variant_id=EXCLUDED.variant_id, assigned_at=NOW()
       RETURNING id::text, variant_id::text AS variant_id, assigned_at`,
      [tenantId, experimentId, userId, variantId]);
    return rows[0];
  }
  async listExperimentAssignments(tenantId: string, experimentId: string, limit = 200) {
    const { rows } = await this.pool.query(
      `SELECT id::text, user_id, variant_id::text AS variant_id, assigned_at
         FROM dos.ui_experiment_assignments
        WHERE tenant_id=$1 AND experiment_id=$2::uuid
        ORDER BY assigned_at DESC LIMIT $3`,
      [tenantId, experimentId, Math.min(limit, 1000)]);
    return rows;
  }

  // ── Rollout rules ───────────────────────────────────────────
  async listRolloutRules(tenantId: string, opts: { flagId?: string | null; experimentId?: string | null }) {
    const { rows } = await this.pool.query(
      `SELECT id::text, flag_id::text AS flag_id,
              experiment_id::text AS experiment_id, rule_kind, rule_payload,
              priority, is_active
         FROM dos.ui_rollout_rules
        WHERE tenant_id=$1
          AND ($2::uuid IS NULL OR flag_id=$2::uuid)
          AND ($3::uuid IS NULL OR experiment_id=$3::uuid)
        ORDER BY priority`,
      [tenantId, opts.flagId ?? null, opts.experimentId ?? null]);
    return rows;
  }
  async createRolloutRule(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_rollout_rules
        (tenant_id, flag_id, experiment_id, rule_kind, rule_payload, priority, is_active)
       VALUES ($1,$2::uuid,$3::uuid,$4,COALESCE($5::jsonb,'{}'::jsonb),
               COALESCE($6,100),COALESCE($7,TRUE))
       RETURNING id::text, rule_kind, priority, is_active`,
      [tenantId, body.flag_id ?? null, body.experiment_id ?? null, body.rule_kind,
       body.rule_payload !== undefined ? JSON.stringify(body.rule_payload) : null,
       body.priority ?? null, body.is_active ?? null]);
    return rows[0];
  }
  async deleteRolloutRule(tenantId: string, ruleId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_rollout_rules WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, ruleId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Kill switches ───────────────────────────────────────────
  async listKillSwitches(tenantId: string, activeOnly = false) {
    const { rows } = await this.pool.query(
      `SELECT id::text, switch_code, is_active, reason, triggered_by,
              triggered_at, resolved_at
         FROM dos.ui_kill_switches
        WHERE tenant_id=$1 AND ($2::boolean IS FALSE OR is_active=TRUE)
        ORDER BY switch_code`, [tenantId, activeOnly]);
    return rows;
  }
  async upsertKillSwitch(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_kill_switches
        (tenant_id, switch_code, is_active, reason)
       VALUES ($1,$2,COALESCE($3,FALSE),$4)
       ON CONFLICT (tenant_id, switch_code) DO UPDATE
         SET is_active=EXCLUDED.is_active, reason=EXCLUDED.reason, updated_at=NOW()
       RETURNING id::text, switch_code, is_active`,
      [tenantId, body.switch_code, body.is_active ?? null, body.reason ?? null]);
    return rows[0];
  }
  async triggerKillSwitch(tenantId: string, switchCode: string, triggeredBy: string, reason?: string | null) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_kill_switches
        (tenant_id, switch_code, is_active, reason, triggered_by, triggered_at)
       VALUES ($1,$2,TRUE,$3,$4,NOW())
       ON CONFLICT (tenant_id, switch_code) DO UPDATE
         SET is_active=TRUE, reason=EXCLUDED.reason,
             triggered_by=EXCLUDED.triggered_by, triggered_at=NOW(),
             resolved_at=NULL, updated_at=NOW()
       RETURNING id::text, switch_code, is_active, triggered_at`,
      [tenantId, switchCode, reason ?? null, triggeredBy]);
    return rows[0];
  }
  async resolveKillSwitch(tenantId: string, switchCode: string) {
    const { rows } = await this.pool.query(
      `UPDATE dos.ui_kill_switches
          SET is_active=FALSE, resolved_at=NOW(), updated_at=NOW()
        WHERE tenant_id=$1 AND switch_code=$2 AND is_active=TRUE
       RETURNING id::text, switch_code, resolved_at`,
      [tenantId, switchCode]);
    return rows[0] ?? null;
  }
}
