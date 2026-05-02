// @ts-nocheck
// Auto-extracted ProactiveLeadership repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class ProactiveLeadershipAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".leadership_alerts SET acknowledged = true, acknowledged_by = $2, acknowledged_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".leadership_alerts WHERE id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT id, tenant_id, alert_type, title, message, severity, source_module, acknowledged, created_at
     FROM "${schema}".leadership_alerts
     WHERE ${conds.join(' AND ')}
     ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, created_at DESC
     LIMIT ${limit}`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".proactive_leadership_patterns (
        tenant_id, signal_type, module_code, pattern_data, detected_at, confidence
      ) VALUES ($1, $2, $3, $4, NOW(), $5)
      ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".proactive_leadership_thresholds
           SET threshold_value = $1,
               last_adjusted_at = CURRENT_TIMESTAMP,
               adjustment_history = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE threshold_id = $3`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT domain, COUNT(*)::int AS cnt FROM "${schema}".proactive_leadership_alerts WHERE status = 'active' AND created_at > NOW() - INTERVAL '24 hours' GROUP BY domain HAVING COUNT(*) > 5`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT domain, COUNT(*)::int AS cnt, COUNT(*) FILTER(WHERE priority = 'critical')::int AS critical FROM "${schema}".proactive_leadership_alerts WHERE status = 'active' GROUP BY domain ORDER BY critical DESC, cnt DESC LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE priority IN ('critical','high'))::int AS high_priority FROM "${schema}".proactive_leadership_alerts WHERE domain = $1 AND status = 'active'`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT module_code, enabled, detection_frequency_minutes FROM "${schema}".proactive_leadership_module_coverage`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT rule_code, module_code, signal_type, enabled FROM "${schema}".proactive_leadership_signal_rules`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT module_code, threshold_key, threshold_value FROM "${schema}".proactive_leadership_thresholds`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".proactive_leadership_config_history
       (tenant_id, changed_at, changed_by, change_type, field_path,
        previous_value, new_value)
     VALUES ($1, NOW(), $2, $3, $4, $5, $6)`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT change_id, changed_at, changed_by, change_type,
            previous_value, new_value, field_path
     FROM "${schema}".proactive_leadership_config_history
     WHERE tenant_id = $1
     ORDER BY changed_at DESC
     LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".proactive_leadership_thresholds
         SET threshold_value = $3, updated_at = NOW()
         WHERE tenant_id = $1 AND module_code = $2 AND threshold_key = $4`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".tenant_preferences
         SET preference_value = $3, updated_at = NOW()
         WHERE tenant_id = $1 AND module = 'proactive_leadership' AND preference_key = $2`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".tenant_preferences
         (tenant_id, module, preference_key, preference_value, updated_at)
       VALUES ($1, 'proactive_leadership', $2, $3, NOW())
       ON CONFLICT (tenant_id, module, preference_key) DO UPDATE
       SET preference_value = EXCLUDED.preference_value,
           updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT preference_key, preference_value
       FROM "${schema}".tenant_preferences
       WHERE tenant_id = $1
         AND module = 'proactive_leadership'`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".proactive_leadership_thresholds (module_code, threshold_key, threshold_value)
     VALUES ('risk', 'high_risk_count', '5'),
            ('compliance', 'overdue_days', '30'),
            ('incident', 'open_count', '10')
     ON CONFLICT (module_code, threshold_key) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".proactive_leadership_signal_rules (rule_code, module_code, signal_type, enabled)
     VALUES ('default_risk', 'risk', 'threshold', true),
            ('default_compliance', 'compliance', 'deadline', true),
            ('default_incident', 'incident', 'frequency', true)
     ON CONFLICT (rule_code) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".proactive_leadership_module_coverage (module_code, enabled)
     SELECT unnest(ARRAY['risk','compliance','policy','evidence','audit','incident','vendor','bcp','asset','governance']),
            true
     ON CONFLICT (module_code) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT sector_code FROM "${schema}".tenants
       WHERE tenant_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT sector_code FROM "${schema}".workspace_profile
       WHERE tenant_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT preference_key FROM "${schema}".tenant_preferences
       WHERE tenant_id = $1 AND module = 'proactive_leadership'`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".proactive_leadership_thresholds
       WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".proactive_signal_rules
       WHERE tenant_id = $1 AND enabled = true`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".proactive_module_coverage
       WHERE tenant_id = $1 AND enabled = true`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".proactive_leadership_config_history
       (tenant_id, changed_at, changed_by, change_type, field_path,
        previous_value, new_value)
     VALUES ($1, NOW(), 'system', 'reset', 'all', '"deleted"', '"re-seeding"')`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".proactive_leadership_thresholds WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".proactive_signal_rules WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".proactive_module_coverage WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".tenant_preferences
       WHERE tenant_id = $1 AND module = 'proactive_leadership'`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".proactive_leadership_config_history
       (tenant_id, changed_at, changed_by, change_type, field_path,
        previous_value, new_value)
     VALUES ($1, NOW(), 'system', 'seed', 'all',
             '"null"', $2)`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".tenant_preferences
         (tenant_id, module, preference_key, preference_value, updated_at)
       VALUES ($1, 'proactive_leadership', 'focus_areas', $2, NOW())
       ON CONFLICT (tenant_id, module, preference_key) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".tenant_preferences
         (tenant_id, module, preference_key, preference_value, updated_at)
       VALUES ($1, 'proactive_leadership', 'notification_targets', $2, NOW())
       ON CONFLICT (tenant_id, module, preference_key) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".tenant_preferences
         (tenant_id, module, preference_key, preference_value, updated_at)
       VALUES ($1, 'proactive_leadership', 'scan_schedules', $2, NOW())
       ON CONFLICT (tenant_id, module, preference_key) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".tenant_preferences
               (tenant_id, module, preference_key, preference_value, updated_at)
             VALUES ($1, 'proactive_leadership', $2, $3, NOW())`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".tenant_preferences
           WHERE tenant_id = $1 AND module = 'proactive_leadership' AND preference_key = $2`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".tenant_preferences
           (tenant_id, module, preference_key, preference_value, updated_at)
         VALUES ($1, 'proactive_leadership', $2, $3, NOW())
         ON CONFLICT (tenant_id, module, preference_key) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `SELECT
         MAX(open_tasks) AS max_load,
         MIN(open_tasks) AS min_load,
         CASE WHEN MIN(open_tasks) > 0
              THEN ROUND(MAX(open_tasks)::numeric / MIN(open_tasks), 2)
              ELSE MAX(open_tasks)::numeric END AS imbalance_ratio
       FROM (
         SELECT COUNT(pt.task_id) FILTER (WHERE pt.status NOT IN ('completed', 'cancelled')) AS open_tasks
         FROM "${schema}".teams t
         LEFT JOIN "${schema}".process_tasks pt ON pt.team_id = t.team_id AND pt.tenant_id = $1
         WHERE t.tenant_id = $1 AND t.status = 'active'
         GROUP BY t.team_id
       ) team_loads`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE priority = 'critical') AS critical,
         COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400), 0) AS avg_days_overdue
       FROM "${schema}".process_tasks
       WHERE tenant_id = $1
         AND status NOT IN ('completed', 'cancelled')
         AND due_date < NOW()`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT signal_type, severity,
              COUNT(*) AS cnt,
              AVG(confidence_score) AS avg_confidence
       FROM "${schema}".governance_signals
       WHERE tenant_id = $1
         AND detected_at > NOW() - INTERVAL '30 days'
       GROUP BY signal_type, severity
       ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT DATE(completed_at) AS day,
              SUM(signals_detected) AS signals,
              SUM(initiatives_fired) AS initiatives,
              SUM(predictions_made) AS predictions,
              AVG(cycle_ms) AS avg_cycle_ms
       FROM "${schema}".proactive_leadership_cycles
       WHERE tenant_id = $1
         AND completed_at > NOW() - INTERVAL '14 days'
       GROUP BY DATE(completed_at)
       ORDER BY day DESC`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT predictions_json, executive_summary_en, risk_trajectory,
                cycle_timestamp
         FROM "${schema}".proactive_leadership_insights
         WHERE tenant_id = $1
         ORDER BY cycle_timestamp DESC
         LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT predictions_json, executive_summary_en, risk_trajectory,
              strategic_priorities_json, board_attention_items_json,
              compliance_momentum_json, cycle_timestamp
       FROM "${schema}".proactive_leadership_insights
       WHERE tenant_id = $1
       ORDER BY cycle_timestamp DESC
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT *, cycle_timestamp AS generated_at
       FROM "${schema}".proactive_leadership_insights
       WHERE ${whereClause}
       ORDER BY cycle_timestamp DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT insight_id, tenant_id, cycle_timestamp AS generated_at,
            signals_count, predictions_json, executive_summary_en,
            executive_summary_ar, risk_trajectory,
            strategic_priorities_json, board_attention_items_json,
            compliance_momentum_json, source_data_snapshot
     FROM "${schema}".proactive_leadership_insights
     WHERE ${whereClause}
     ORDER BY cycle_timestamp DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total
     FROM "${schema}".proactive_leadership_insights
     WHERE ${whereClause}`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".proactive_leadership_cycles
       (tenant_id, signals_detected, initiatives_fired, predictions_made,
        threshold_adjustments, cycle_ms, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".proactive_leadership_insights
             (tenant_id, cycle_timestamp, signals_count, predictions_json,
              executive_summary_en, executive_summary_ar, risk_trajectory)
           VALUES ($1, NOW(), $2, $3, $4, $5, $6)`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".proactive_leadership_insights
           (tenant_id, cycle_timestamp, signals_count, predictions_json,
            executive_summary_en, executive_summary_ar, risk_trajectory,
            strategic_priorities_json, board_attention_items_json,
            compliance_momentum_json, source_data_snapshot)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".process_tasks
               (tenant_id, title, description, priority, status, entity_type, source,
                due_date, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'open', 'proactive_leadership', 'ai_advisor',
                     NOW() + ($5 || ' days')::interval, NOW(), NOW())`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT gs.signal_type, gs.source_module, gs.severity,
              gs.confidence_score, gs.detected_at, gs.status,
              gs.recommended_action_type
       FROM "${schema}".governance_signals gs
       WHERE gs.tenant_id = $1
         AND gs.detected_at > NOW() - INTERVAL '60 days'
       ORDER BY gs.detected_at DESC
       LIMIT 30`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `SELECT rd.deadline_id, rd.framework_code, rd.deadline_title, rd.due_date,
              rd.severity, rd.status,
              EXTRACT(EPOCH FROM (rd.due_date - NOW())) / 86400 AS days_until
       FROM "${schema}".regulatory_deadlines rd
       WHERE rd.tenant_id = $1
         AND rd.due_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
         AND rd.status != 'completed'
       ORDER BY rd.due_date ASC
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT t.team_id, t.team_name, t.team_code,
              COUNT(pt.task_id) FILTER (WHERE pt.status NOT IN ('completed', 'cancelled')) AS open_tasks,
              COUNT(pt.task_id) FILTER (WHERE pt.status = 'completed') AS completed_tasks,
              COUNT(pt.task_id) FILTER (WHERE pt.due_date < NOW() AND pt.status NOT IN ('completed', 'cancelled')) AS overdue_tasks
       FROM "${schema}".teams t
       LEFT JOIN "${schema}".process_tasks pt ON pt.team_id = t.team_id AND pt.tenant_id = $1
       WHERE t.tenant_id = $1 AND t.status = 'active'
       GROUP BY t.team_id, t.team_name, t.team_code
       ORDER BY open_tasks DESC
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT pt.task_id, pt.title, pt.priority, pt.due_date, pt.status,
              pt.assigned_to, pt.entity_type,
              EXTRACT(EPOCH FROM (NOW() - pt.due_date)) / 86400 AS days_overdue
       FROM "${schema}".process_tasks pt
       WHERE pt.tenant_id = $1
         AND pt.status NOT IN ('completed', 'cancelled')
         AND pt.due_date < NOW()
       ORDER BY pt.due_date ASC
       LIMIT 40`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT c.framework_code, c.domain_code,
              COUNT(*) AS total_controls,
              COUNT(*) FILTER (WHERE c.status != 'compliant') AS non_compliant,
              ROUND(COUNT(*) FILTER (WHERE c.status = 'compliant')::numeric / GREATEST(COUNT(*), 1) * 100, 1) AS compliance_pct
       FROM "${schema}".controls c
       WHERE c.tenant_id = $1
       GROUP BY c.framework_code, c.domain_code
       HAVING COUNT(*) FILTER (WHERE c.status != 'compliant') > 0
       ORDER BY non_compliant DESC
       LIMIT 30`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT r.risk_id, r.risk_title, r.severity, r.status, r.risk_category,
              r.created_at, r.updated_at,
              CASE WHEN r.updated_at > r.created_at THEN 'active' ELSE 'new' END AS trend
       FROM "${schema}".risks r
       WHERE r.tenant_id = $1
         AND r.status NOT IN ('closed', 'archived', 'mitigated')
       ORDER BY
         CASE r.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         r.created_at DESC
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".proactive_leadership_configs WHERE status = 'draft' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".proactive_leadership_insights WHERE status = 'stale' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".proactive_leadership_configs WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'proactive-leadership' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'proactive-leadership','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".proactive_leadership_configs WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND module = 'proactive-leadership' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".proactive_leadership_configs SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `SELECT DATE(created_at) AS date, AVG(risk_score)::numeric(5,1) AS avg_score
       FROM "${schema}".risks WHERE created_at >= NOW() - INTERVAL '90 days'
       GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `SELECT risk_id AS id, title, risk_score AS score, category
       FROM "${schema}".risks WHERE status != 'closed' ORDER BY risk_score DESC NULLS LAST LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(AVG(risk_score), 0)::numeric(5,1) AS avg_score,
              COUNT(*) FILTER (WHERE treatment_status IS NULL OR treatment_status = 'open')::int AS unmitigated
       FROM "${schema}".risks WHERE status != 'closed'`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `SELECT id, tenant_id, category, title, description, severity, source_module, created_at
     FROM "${schema}".strategic_insights
     WHERE ${conds.join(' AND ')}
     ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, created_at DESC
     LIMIT ${limit}`;
    return safeQuery(query, args);
  }

}
