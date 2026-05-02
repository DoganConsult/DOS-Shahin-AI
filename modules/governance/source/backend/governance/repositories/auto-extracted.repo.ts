// Auto-extracted Governance repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class GovernanceAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".governance_policies WHERE status = 'expired' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".governance_policies WHERE status = 'draft' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".governance_policies WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'governance' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'governance','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".board_decision_actions
     WHERE decision_id = $1
     ORDER BY due_date ASC NULLS LAST, created_at ASC`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".board_decision_actions WHERE action_id = $1`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".board_decision_actions
     SET status = $1, completed_at = ${completedAt}, updated_at = NOW()
     WHERE action_id = $2`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_decision_actions
     (action_id, decision_id, title_en, title_ar, description_en, description_ar,
      assignee_id, assignee_name, due_date, status, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT bd.* FROM "${schema}".board_decisions bd
     JOIN "${schema}".board_decision_links bl ON bl.decision_id = bd.decision_id
     WHERE bl.entity_type = $1 AND bl.entity_id = $2
     ORDER BY bd.decision_date DESC`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT ${nameCol} as title, status FROM "${schema}".${table} WHERE id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".board_decision_links WHERE decision_id = $1 ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".board_decision_links WHERE link_id = $1`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_decision_links
     (link_id, decision_id, entity_type, entity_id, link_type, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".board_decisions SET status = $1, updated_at = NOW() WHERE decision_id = $2`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".board_decisions SET ${fields.join(", ")} WHERE decision_id = $${idx}`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".board_decisions ${where}
     ORDER BY decision_date DESC, created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FROM "${schema}".board_decisions ${where}`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".board_decisions WHERE decision_id = $1`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_decisions
     (decision_id, title_en, title_ar, committee_id, committee_name,
      decision_type, decision_date, effective_date, expiry_date,
      status, rationale_en, rationale_ar, risk_impact,
      approvers, vote_summary, attachment_ids, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".policies WHERE regulatory_reference ILIKE $1 OR title ILIKE $1`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".controls WHERE framework_id ILIKE $1 OR control_id ILIKE $1`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FILTER (WHERE status = 'valid')::int AS valid, COUNT(*)::int AS total FROM "${schema}".evidence_tasks`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FILTER (WHERE test_status = 'passed')::int AS passing, COUNT(*)::int AS total FROM "${schema}".controls`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'valid' OR status = 'approved')::int AS valid FROM "${schema}".evidence_tasks`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS overdue FROM "${schema}".process_tasks WHERE status IN ('open', 'in_progress') AND due_at < NOW()`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title, severity, status FROM "${schema}".risks WHERE status != 'closed' ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant, COUNT(*)::int AS total FROM "${schema}".controls`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'open' AND due_at < NOW())::int AS overdue
      FROM "${schema}".process_tasks`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS open_incidents FROM "${schema}".process_tasks WHERE task_type = 'incident' AND status = 'open'`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE test_status = 'passed')::int AS passing
      FROM "${schema}".controls`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'valid' OR status = 'approved')::int AS valid
      FROM "${schema}".evidence_tasks`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT
      COUNT(*)::int AS total_risks,
      COUNT(*) FILTER (WHERE severity = 'critical' OR severity = 'high')::int AS high_risks,
      AVG(CASE severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END)::real AS avg_severity
      FROM "${schema}".risks WHERE status != 'closed'`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT
      COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant,
      COUNT(*)::int AS total
      FROM "${schema}".controls`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".board_pack_items WHERE pack_id = $1 ORDER BY sort_order`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".board_packs WHERE pack_id = $1`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_pack_items
         (item_id, pack_id, item_type, title_en, title_ar, content, sort_order, source_entity_type, auto_generated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_packs
       (pack_id, tenant_id, title_en, title_ar, pack_type, period_start, period_end, narrative, created_by, auto_generated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_plans,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_plans,
         COUNT(*) FILTER (WHERE last_tested_at IS NOT NULL AND last_tested_at > NOW() - INTERVAL '1 year')::int AS tested_this_year,
         COUNT(*) FILTER (WHERE last_tested_at IS NULL OR last_tested_at < NOW() - INTERVAL '1 year')::int AS needs_testing
       FROM "${schema}".bcp_plans WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_plans,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'overdue' OR (due_date IS NOT NULL AND due_date < NOW() AND status != 'completed'))::int AS overdue
       FROM "${schema}".remediation_plans WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_incidents,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_incidents,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open_incidents,
         COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_incidents,
         ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 1) AS avg_resolution_hours
       FROM "${schema}".incidents WHERE deleted_at IS NULL
         AND created_at > NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_vendors,
         COUNT(*) FILTER (WHERE risk_rating = 'critical')::int AS critical_vendors,
         COUNT(*) FILTER (WHERE risk_rating = 'high')::int AS high_risk_vendors,
         COUNT(*) FILTER (WHERE compliance_status = 'non_compliant')::int AS non_compliant
       FROM "${schema}".vendors WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_findings,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_findings,
         COUNT(*) FILTER (WHERE severity = 'high')::int AS high_findings,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open_findings,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_findings,
         CASE WHEN COUNT(*) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE status = 'closed')::numeric / COUNT(*)::numeric * 100, 1)
           ELSE 100 END AS closure_rate
       FROM "${schema}".audit_findings WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS open_gaps FROM "${schema}".compliance_gaps
       WHERE status NOT IN ('closed','resolved','remediated')`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(DISTINCT cf.framework_id)::int AS total_frameworks,
         COUNT(cc.control_id)::int AS total_controls,
         COUNT(cc.control_id) FILTER (WHERE cc.effectiveness_score >= 70)::int AS effective_controls,
         COUNT(cc.control_id) FILTER (WHERE cc.effectiveness_score < 40)::int AS failed_controls,
         ROUND(AVG(cc.effectiveness_score)::numeric, 1) AS avg_effectiveness
       FROM "${schema}".compliance_frameworks cf
       LEFT JOIN "${schema}".compliance_controls cc ON cc.framework_id = cf.framework_id
       WHERE cf.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `SELECT appetite_level, threshold_value FROM "${schema}".risk_appetite_config WHERE active = true LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_risks,
         COUNT(*) FILTER (WHERE residual_score >= 15)::int AS critical_risks,
         COUNT(*) FILTER (WHERE residual_score BETWEEN 10 AND 14)::int AS high_risks,
         COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted_risks,
         ROUND(AVG(residual_score)::numeric, 1) AS avg_residual,
         COUNT(*) FILTER (WHERE has_open_findings = true)::int AS risks_with_findings
       FROM "${schema}".risks WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_report_schedules
       (schedule_id, tenant_id, cron_expression, pack_type, recipients, active, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, true, NOW())
     ON CONFLICT (tenant_id, pack_type) DO UPDATE
       SET cron_expression = EXCLUDED.cron_expression,
           recipients = EXCLUDED.recipients,
           active = true,
           updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT recommendation_id, recommendation_text, accepted_status, priority, created_at
     FROM "${schema}".governance_recommendations
     WHERE accepted_status IN ('drafted', 'accepted')
     ORDER BY
       CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       created_at DESC
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT
       COALESCE(module, 'any') AS module,
       COALESCE(event, 'any') AS event,
       COUNT(*)::int AS count
     FROM "${schema}".agrc_event_log
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY module, event
     ORDER BY count DESC
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `SELECT
       COALESCE(status, 'any') AS status,
       COUNT(*)::int AS count
     FROM "${schema}".evidence_tasks
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT
       COALESCE(status, 'any') AS status,
       COUNT(*)::int AS count
     FROM "${schema}".policies
     WHERE deleted_at IS NULL
     GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT finding_id, title, severity, status, due_date, created_at
     FROM "${schema}".audit_findings
     WHERE status NOT IN ('closed', 'resolved')
       AND deleted_at IS NULL
     ORDER BY
       CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       created_at DESC
     LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT
       COALESCE(status, 'any') AS status,
       COUNT(*)::int AS count
     FROM "${schema}".controls
     WHERE deleted_at IS NULL
     GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT
       COALESCE(impact, 'any') AS impact,
       COALESCE(likelihood, 'any') AS likelihood,
       COUNT(*)::int AS count
     FROM "${schema}".risks
     WHERE deleted_at IS NULL
     GROUP BY impact, likelihood
     ORDER BY impact, likelihood`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT score, snapshot_date, framework_code, details
     FROM "${schema}".compliance_score_snapshots
     WHERE snapshot_date >= $1 AND snapshot_date <= $2
     ORDER BY snapshot_date DESC LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".sod_rules WHERE is_active = true
       AND ((role_a = $1 AND role_b = ANY($2)) OR (role_b = $1 AND role_a = ANY($2)))`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT role_code FROM "${schema}".actor_role_assignments WHERE user_id = $1 AND is_active = true`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".sod_conflicts SET status = 'open', resolved_at = NULL, resolved_by = NULL, resolution_note = $1, updated_at = NOW() WHERE conflict_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".sod_conflict_history WHERE conflict_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT conflict_type AS pattern, COUNT(*)::int AS count, MAX(severity) AS severity
     FROM "${schema}".sod_conflicts WHERE deleted_at IS NULL
     GROUP BY conflict_type ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `SELECT
       d::date AS date,
       COALESCE(SUM(CASE WHEN c.detected_at::date = d THEN 1 ELSE 0 END), 0)::int AS detected,
       COALESCE(SUM(CASE WHEN c.resolved_at::date = d THEN 1 ELSE 0 END), 0)::int AS resolved
     FROM generate_series(NOW() - ($1 || ' days')::interval, NOW(), '1 day') AS d
     LEFT JOIN "${schema}".sod_conflicts c ON c.detected_at::date = d OR c.resolved_at::date = d
     GROUP BY d ORDER BY d`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".sod_conflicts SET status = $1, resolved_by = $2, resolution_note = $3, resolved_at = NOW(), updated_at = NOW() WHERE conflict_id = $4 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".sod_conflicts (user_id, conflict_type, entity_type, role_a, role_b, severity, status, detected_at, scan_id)
         VALUES ($1, 'authority', 'permission', $2, $3, 'medium', 'open', NOW(), $4)
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `SELECT ara.user_id, rp1.permission_code AS perm_create, rp2.permission_code AS perm_approve
       FROM "${schema}".actor_role_assignments ara
       JOIN "${schema}".role_permissions rp1 ON rp1.role_code = ara.role_code AND rp1.permission_code LIKE '%.create' AND rp1.is_active = true
       JOIN "${schema}".role_permissions rp2 ON rp2.role_code = ara.role_code AND rp2.permission_code LIKE '%.approve' AND rp2.is_active = true
       WHERE ara.is_active = true
         AND split_part(rp1.permission_code, '.', 1) = split_part(rp2.permission_code, '.', 1)`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".sod_conflicts (user_id, conflict_type, entity_type, entity_id, role_a, role_b, severity, status, detected_at, scan_id)
         VALUES ($1, 'raci', $2, $3, $4, $5, 'high', 'open', NOW(), $6)
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `SELECT r1.user_id, r1.entity_type, r1.entity_id, r1.role AS role_a, r2.role AS role_b
       FROM "${schema}".raci_assignments r1
       JOIN "${schema}".raci_assignments r2 ON r1.user_id = r2.user_id AND r1.entity_id = r2.entity_id AND r1.entity_type = r2.entity_type
       WHERE r1.role = 'R' AND r2.role = 'A' AND r1.is_active = true AND r2.is_active = true`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".sod_conflicts WHERE ${where}`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".sod_conflicts WHERE ${where} ORDER BY detected_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT ${statusField} FROM "${schema}".${table} WHERE ${entityIdField} = $1`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = queryText;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue (tenant_id, recipient_id, notification_type, subject, body, priority, channels)
         VALUES ($1, $2, 'gate_blocked', $3, $4, 'high', $5)`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".gate_validation_rules
     WHERE gate_id = $1 AND enabled = true ORDER BY execution_order`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".gate_definitions
     WHERE gate_code = $1 AND enabled = true
     AND tenant_id IN ($2, '00000000-0000-0000-0000-000000000000')
     ORDER BY tenant_id DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".enforcement_gate_log
       (gate_type, subject_id, subject_name, allowed, reason, requested_by, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING gate_log_id`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".enforcement_gate_log (
      gate_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gate_type VARCHAR(20) NOT NULL,
      subject_id VARCHAR(200) NOT NULL,
      subject_name VARCHAR(500),
      allowed BOOLEAN NOT NULL,
      reason TEXT,
      requested_by VARCHAR(64),
      details JSONB DEFAULT '{}',
      overridden BOOLEAN DEFAULT FALSE,
      overridden_by VARCHAR(64),
      override_justification TEXT,
      overridden_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".enforcement_gate_log ${where}
     ORDER BY created_at DESC LIMIT ${limit}`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `SELECT dd_id, status FROM "${schema}".vendor_due_diligence
       WHERE vendor_id = $1 AND status = 'approved' AND deleted_at IS NULL
       ORDER BY completed_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".training_assignments
       WHERE user_id = $1 AND status IN ('assigned','in_progress')
         AND due_date < NOW()`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `SELECT bia_id FROM "${schema}".bia_assessments WHERE status = 'approved' AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `SELECT pir_id FROM "${schema}".incident_pir WHERE incident_id = $1 AND status IN ('completed','signed_off') LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `SELECT severity, status FROM "${schema}".incidents WHERE incident_id = $1`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".enforcement_gate_log SET
         overridden = TRUE, overridden_by = $1, override_justification = $2, overridden_at = NOW()
       WHERE gate_log_id = $3`;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".gate_override_requests SET status=$1, approved_by=$2, approved_at=NOW() WHERE override_id=$3`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".gate_override_requests SET status='expired' WHERE override_id=$1`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".gate_override_requests WHERE override_id = $1 AND status = 'pending'`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".enforcement_gate_log SET
       overridden = TRUE, overridden_by = $1, override_justification = $2, overridden_at = NOW()
     WHERE gate_log_id = $3`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM users WHERE tenant_id=$1 AND role='owner' LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".gate_override_requests
         (gate_log_id, requested_by, justification, status, expires_at)
       VALUES ($1, $2, $3, 'pending', $4) RETURNING override_id`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".gate_override_requests (
      override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gate_log_id UUID NOT NULL,
      requested_by VARCHAR(64) NOT NULL,
      justification TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      approved_by VARCHAR(64),
      approved_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".enforcement_gate_log WHERE gate_log_id = $1`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `SELECT
       BOOL_OR(raci_role = 'responsible') AS has_responsible,
       BOOL_OR(raci_role = 'accountable') AS has_accountable,
       BOOL_OR(user_id IS NOT NULL)      AS has_user_owner,
       BOOL_OR(team_id IS NOT NULL)      AS has_team_owner
     FROM "${schema}".grc_raci_assignments
     WHERE entity_type = $1 AND entity_id = $2
       AND is_active = TRUE AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `SELECT control_id, lifecycle_state FROM "${schema}".ucf_controls
     WHERE control_id IN (${placeholders})`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".${table} ORDER BY team_code, raci_role`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS auto_assigned_count
     FROM "${schema}".grc_raci_assignments
     WHERE assignment_source = 'auto_provision' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS expiring_count
     FROM "${schema}".grc_raci_assignments
     WHERE is_active = TRUE AND deleted_at IS NULL
       AND effective_to IS NOT NULL
       AND effective_to BETWEEN NOW() AND NOW() + INTERVAL '30 days'`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `SELECT
       t.team_code, t.name_en AS team_name,
       COUNT(DISTINCT gra.assignment_id) AS total_assignments,
       COUNT(DISTINCT CASE WHEN gra.raci_role = 'responsible' THEN gra.assignment_id END) AS responsible_count,
       COUNT(DISTINCT CASE WHEN gra.raci_role = 'accountable' THEN gra.assignment_id END) AS accountable_count
     FROM "${schema}".grc_raci_assignments gra
     JOIN "${schema}".teams t ON t.team_id = gra.team_id
     WHERE gra.is_active = TRUE AND gra.deleted_at IS NULL
     GROUP BY t.team_code, t.name_en
     ORDER BY total_assignments DESC
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `SELECT entity_type, COUNT(*) AS gap_count
     FROM "${schema}".grc_raci_gaps
     WHERE has_responsible = FALSE OR has_accountable = FALSE
     GROUP BY entity_type`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `SELECT
       entity_type,
       COUNT(DISTINCT entity_id) AS total_entities,
       COUNT(DISTINCT CASE WHEN has_responsible THEN entity_id END) AS with_responsible,
       COUNT(DISTINCT CASE WHEN has_accountable THEN entity_id END) AS with_accountable,
       COUNT(DISTINCT CASE WHEN has_user_owner THEN entity_id END) AS with_user_owner,
       COUNT(DISTINCT CASE WHEN has_team_owner THEN entity_id END) AS with_team_owner
     FROM (
       SELECT
         gra.entity_type,
         gra.entity_id,
         BOOL_OR(gra.raci_role = 'responsible') AS has_responsible,
         BOOL_OR(gra.raci_role = 'accountable') AS has_accountable,
         BOOL_OR(gra.user_id IS NOT NULL) AS has_user_owner,
         BOOL_OR(gra.team_id IS NOT NULL) AS has_team_owner
       FROM "${schema}".grc_raci_assignments gra
       WHERE gra.is_active = TRUE AND gra.deleted_at IS NULL
       GROUP BY gra.entity_type, gra.entity_id
     ) sub
     GROUP BY entity_type
     ORDER BY entity_type`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_actions SET ${sets.join(', ')}
     WHERE action_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_actions
      (evidence_id, action_type, title, description, assigned_to, assigned_team, due_date, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `SELECT ea.*, t.name_en AS team_name
     FROM "${schema}".evidence_actions ea
     LEFT JOIN "${schema}".teams t ON t.team_code = ea.assigned_team
     WHERE ea.evidence_id = $1 AND ea.deleted_at IS NULL
     ORDER BY CASE ea.priority
       WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       ea.due_date ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".${table} SET ${sets.join(', ')}, updated_at = NOW()
     WHERE ${idCol} = $${idx} RETURNING *`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".${table}
      (${idCol}, user_id, ownership_type, is_primary, assigned_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT ON CONSTRAINT uq_${data.entityType === 'control' ? 'control' : data.entityType}_owner_active
     DO UPDATE SET updated_at = NOW(), is_primary = EXCLUDED.is_primary
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".grc_raci_assignments SET deleted_at = NOW(), is_active = FALSE
     WHERE assignment_id = $1`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `SELECT gra.*,
            t.team_code, t.name_en AS team_name,
            d.name_en AS dept_name
     FROM "${schema}".grc_raci_assignments gra
     LEFT JOIN "${schema}".teams t ON t.team_id = gra.team_id
     LEFT JOIN "${schema}".departments d ON d.dept_id = gra.dept_id
     WHERE gra.entity_type = $1 AND gra.entity_id = $2
       AND gra.is_active = TRUE AND gra.deleted_at IS NULL
     ORDER BY CASE gra.raci_role
       WHEN 'accountable' THEN 1 WHEN 'responsible' THEN 2
       WHEN 'consulted' THEN 3 WHEN 'informed' THEN 4 END`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".grc_raci_assignments
      (entity_type, entity_id, team_id, dept_id, user_id, raci_role,
       assignment_source, effective_from, effective_to, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT ON CONSTRAINT uq_grc_raci_no_duplicate DO UPDATE SET
       updated_at = NOW(), notes = EXCLUDED.notes
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".obligation_policy_links
     WHERE obligation_id = $1 AND policy_id = $2`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".obligation_policy_links
     (link_id, obligation_id, policy_id, link_type, relevance_score, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".obligation_policy_links
       SET link_type = $1, relevance_score = $2, notes = $3, updated_at = NOW()
       WHERE obligation_id = $4 AND policy_id = $5`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `SELECT link_id FROM "${schema}".obligation_policy_links
     WHERE obligation_id = $1 AND policy_id = $2`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `SELECT l.link_id, l.obligation_id, l.policy_id, l.link_type,
            l.relevance_score, l.notes, p.title AS policy_title, p.status AS policy_status
     FROM "${schema}".obligation_policy_links l
     LEFT JOIN "${schema}".policies p ON p.policy_id::text = l.policy_id::text
     WHERE l.obligation_id = $1
     ORDER BY l.relevance_score DESC`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `SELECT m.control_id, m.mapping_type, m.coverage_percent, c.title
     FROM "${schema}".obligation_control_mappings m
     JOIN "${schema}".controls c ON c.control_id = m.control_id
     WHERE m.obligation_id = $1 AND c.deleted_at IS NULL
     ORDER BY m.coverage_percent DESC, c.title`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `SELECT obligation_id FROM "${schema}".compliance_obligations
     WHERE framework_id = $1 AND status = 'active' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".compliance_obligations
       SET mapped_controls = $1, updated_at = NOW(), updated_by = $2
       WHERE obligation_id = $3`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".obligation_control_mappings
         (mapping_id, obligation_id, control_id, mapping_type, coverage_percent, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `SELECT mapping_id FROM "${schema}".obligation_control_mappings
         WHERE obligation_id = $1 AND control_id = $2`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title
     FROM "${schema}".controls
     WHERE $1 = ANY(frameworks) AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".compliance_obligations
         (obligation_id, framework_id, requirement_ref, title_en, title_ar, description_en, description_ar,
          priority, evidence_types, status, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `SELECT obligation_id FROM "${schema}".compliance_obligations
         WHERE framework_id = $1 AND requirement_ref = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `SELECT name_en, name_ar FROM instruments WHERE instrument_id = $1`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `SELECT node_id, code, title_en, title_ar, description_en, description_ar, priority, evidence_types
     FROM instrument_structure
     WHERE instrument_id = $1 AND level = 4
     ORDER BY sort_order, code`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".compliance_obligations
     SET deleted_at = NOW(), updated_by = $1
     WHERE obligation_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".compliance_obligations
     SET ${updateFields.join(', ')}
     WHERE obligation_id = $${paramIdx} AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = countSql;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `SELECT obligation_id, framework_id, requirement_ref, title_en, title_ar, description_en, description_ar,
            applicability, owner_id, status, mapped_controls, priority, evidence_types, review_frequency,
            created_at, updated_at, created_by, updated_by
     FROM "${schema}".compliance_obligations
     WHERE obligation_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".compliance_obligations
     (obligation_id, framework_id, requirement_ref, title_en, title_ar, description_en, description_ar,
      applicability, owner_id, status, priority, evidence_types, review_frequency, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, policy_code_rules FROM "${schema}".policies
       WHERE policy_code_rules IS NOT NULL 
         AND status = 'approved' 
         AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE valid_until < NOW())::int AS expired
                 FROM "${schema}".evidence`;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS open_gaps
                 FROM "${schema}".compliance_gaps WHERE status != 'resolved'`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total,
                        AVG(residual_score)::numeric AS avg_residual_score
                 FROM "${schema}".risks WHERE status != 'closed'`;
    return safeQuery(query, args);
  }

  static async query138(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total, 
                        COUNT(*) FILTER (WHERE status = 'implemented')::int AS implemented
                 FROM "${schema}".tenant_controls`;
    return safeQuery(query, args);
  }

  static async query139(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM public.users
     WHERE tenant_id = $1 AND role IN ('admin','tenant_admin','platform_admin') AND status = 'active'
     ORDER BY created_at ASC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query140(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_action_items
         (title, description, assigned_to, due_date, priority, status, source_type, board_attention, escalation_level)
       VALUES ($1, $2, $3, NOW() + ($4 || ' days')::INTERVAL, $5, 'open', $6, $7, 0)`;
    return safeQuery(query, args);
  }

  static async query141(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".governance_action_items
       WHERE title = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query142(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_authority_levels (level_code, level_name, rank)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query143(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".authority_matrix (rule_id, decision_type, min_criticality, required_approver_role, escalation_timeout_hours)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query144(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_executive_summaries
       (tenant_id, title_en, title_ar, period_start, period_end, summary_type, status,
        content, highlights, key_risks, key_decisions, recommendations, prepared_by)
     VALUES ($1, $2, $3, NOW() - INTERVAL '30 days', NOW(), 'monthly', 'draft',
             $4, $5, $6, $7, $8, $9)`;
    return safeQuery(query, args);
  }

  static async query145(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".governance_executive_summaries LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query146(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_pack_items
         (pack_id, item_type, title, content, sort_order, source_entity_type)
       VALUES ($1, $2, $3, $4, $5, $6)`;
    return safeQuery(query, args);
  }

  static async query147(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_packs
       (pack_id, tenant_id, title_en, title_ar, meeting_date, status, prepared_by)
     VALUES ($1, $2, 'Quarterly Governance Board Pack', 'حزمة مجلس الإدارة الفصلية', NOW() + INTERVAL '30 days', 'draft', $3)`;
    return safeQuery(query, args);
  }

  static async query148(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".board_packs LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query149(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_charters
         (committee_id, tenant_id, title_en, title_ar, purpose, scope, status, activated_at, expiry_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW() + INTERVAL '1 year', $7)`;
    return safeQuery(query, args);
  }

  static async query150(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_committee_members
         (committee_id, user_id, role_in_committee, is_chair, voting_rights, created_by)
       VALUES ($1, $2, 'chair', TRUE, TRUE, $3)
       ON CONFLICT (committee_id, user_id) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query151(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".committees (committee_id, name, purpose, members, meeting_schedule)
       VALUES ($1, $2, $3, $4, $5)`;
    return safeQuery(query, args);
  }

  static async query152(schema: string, args: unknown[]) {
    const query = `SELECT committee_id FROM "${schema}".committees WHERE name = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query153(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_registers
             (register_type, name_en, description, status, metadata, created_by)
           SELECT 'control', $1, $2, 'active',
                  jsonb_build_object('policy_id', $3::TEXT, 'control_id', $4::TEXT, 'link_type', 'policy_control'),
                  'auto-fire'
           WHERE NOT EXISTS (
             SELECT 1 FROM "${schema}".governance_registers
             WHERE metadata->>'policy_id' = $3::TEXT AND metadata->>'control_id' = $4::TEXT
           )`;
    return safeQuery(query, args);
  }

  static async query154(schema: string, args: unknown[]) {
    const query = `SELECT control_id FROM "${schema}".controls
         WHERE framework_id = $1 AND deleted_at IS NULL LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query155(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, frameworks FROM "${schema}".policies WHERE deleted_at IS NULL AND frameworks IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query156(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_registers
         (register_type, name_en, name_ar, description, status, created_by)
       VALUES ($1, $2, $3, $4, 'active', 'auto-fire')`;
    return safeQuery(query, args);
  }

  static async query157(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".governance_registers
       WHERE register_type = $1 AND name_en = $2 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query158(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_registers
             (register_type, name_en, description, owner_id, status, metadata, created_by)
           SELECT 'control', $1, $2, NULL, 'active',
                  jsonb_build_object('procedure_id', $3::TEXT, 'control_id', $4::TEXT, 'link_type', 'procedure_control'),
                  'auto-fire'
           WHERE NOT EXISTS (
             SELECT 1 FROM "${schema}".governance_registers
             WHERE metadata->>'procedure_id' = $3::TEXT AND metadata->>'control_id' = $4::TEXT
           )`;
    return safeQuery(query, args);
  }

  static async query159(schema: string, args: unknown[]) {
    const query = `SELECT control_id FROM "${schema}".controls
         WHERE (domain ILIKE $1 OR title ILIKE $1) AND deleted_at IS NULL LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query160(schema: string, args: unknown[]) {
    const query = `SELECT sop_id, process_type FROM "${schema}".sop_procedures WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query161(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_obligation_control_links
           (obligation_id, control_id, linked_by)
         VALUES ($1, $2, 'auto-fire')
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query162(schema: string, args: unknown[]) {
    const query = `SELECT control_id FROM "${schema}".controls
       WHERE framework_id = $1 AND deleted_at IS NULL LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query163(schema: string, args: unknown[]) {
    const query = `SELECT o.obligation_id, m.issuing_authority
     FROM "${schema}".governance_obligations o
     JOIN "${schema}".governance_mandates m ON m.mandate_id = o.mandate_id
     WHERE o.deleted_at IS NULL AND m.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query164(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_delegations
         (tenant_id, delegator_user_id, delegate_user_id, authority_type,
          scope_description, status, effective_date, expiry_date, created_by)
       VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', $6)`;
    return safeQuery(query, args);
  }

  static async query165(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM public.users
       WHERE tenant_id = $1 AND role = $2 AND status = 'active'
       ORDER BY created_at ASC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query166(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".governance_delegations
       WHERE authority_type = $1 AND delegator_user_id = $2 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query167(schema: string, args: unknown[]) {
    const query = `SELECT decision_type, required_approver_role, escalation_timeout_hours
     FROM "${schema}".authority_matrix WHERE is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query168(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_exceptions
         (control_id, reason, risk_level, status, requested_by, approved_by,
          valid_from, valid_to, compensating_controls)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE + ($7 || ' days')::INTERVAL, $8)`;
    return safeQuery(query, args);
  }

  static async query169(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title FROM "${schema}".controls WHERE deleted_at IS NULL LIMIT 3`;
    return safeQuery(query, args);
  }

  static async query170(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".control_exceptions WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query171(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_signal_rules
         (tenant_id, signal_type, enabled, threshold_json, severity_mapping_json)
       SELECT $1, $2, TRUE, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".governance_signal_rules
         WHERE signal_type = $2 AND (tenant_id = $1 OR tenant_id IS NULL)
       )`;
    return safeQuery(query, args);
  }

  static async query172(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_health_thresholds
       (tenant_id, green_min, yellow_min, dimension_weights)
     VALUES ($1, 80, 60, $2)
     ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query173(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".governance_health_thresholds WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query174(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_obligations
         (tenant_id, mandate_id, title_en, title_ar, description, obligation_type, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'regulatory', 'active', 'system')`;
    return safeQuery(query, args);
  }

  static async query175(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_mandates
         (mandate_id, tenant_id, title_en, title_ar, issuing_authority, jurisdiction,
          priority, status, effective_date, expiry_date, description, created_by)
       VALUES ($1, $2, $3, $4, $5, 'SAU', 'high', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 years', $6, 'system')`;
    return safeQuery(query, args);
  }

  static async query176(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".governance_mandates
       WHERE title_en = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query177(schema: string, args: unknown[]) {
    const query = `SELECT framework_code, framework_name_en FROM "${schema}".frameworks WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query178(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_meeting_attendees
           (meeting_id, user_id, attendance_status)
         VALUES ($1, $2, 'attended')
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query179(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_decision_votes
             (decision_id, voter_user_id, vote, comments)
           VALUES ($1, $2, 'for', 'Approved as presented')
           ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query180(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_decisions
           (decision_id, meeting_id, decision_text, decision_type, status, effective_date, review_date)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '90 days')`;
    return safeQuery(query, args);
  }

  static async query181(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_agenda_items
           (meeting_id, sequence, title, status, decision_required)
         VALUES ($1, $2, $3, 'resolved', $4)`;
    return safeQuery(query, args);
  }

  static async query182(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_meetings
         (meeting_id, committee_id, title, scheduled_at, status, duration_minutes)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', 'scheduled', 90)`;
    return safeQuery(query, args);
  }

  static async query183(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_meetings
         (meeting_id, committee_id, title, scheduled_at, status, minutes, duration_minutes)
       VALUES ($1, $2, $3, NOW() - INTERVAL '30 days', 'completed', $4, 90)`;
    return safeQuery(query, args);
  }

  static async query184(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".governance_meetings WHERE committee_id = $1`;
    return safeQuery(query, args);
  }

  static async query185(schema: string, args: unknown[]) {
    const query = `SELECT committee_id, name FROM "${schema}".committees WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query186(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_objectives
         (title_en, title_ar, description, category, target_date, owner_id, status, progress_percent, created_by)
       VALUES ($1, $2, $3, $4, NOW() + $5::INTERVAL, $6, 'active', 0, $7)`;
    return safeQuery(query, args);
  }

  static async query187(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".governance_objectives
       WHERE title_en = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query188(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_auto_fire_log
       SET status = 'failed', completed_at = NOW(), error_message = $2
       WHERE fire_id = $1`;
    return safeQuery(query, args);
  }

  static async query189(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_auto_fire_log
       SET status = 'completed', completed_at = NOW(), components_fired = $2
       WHERE fire_id = $1`;
    return safeQuery(query, args);
  }

  static async query190(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_auto_fire_log
       (fire_id, tenant_id, fire_type, triggered_by, status)
     VALUES ($1, $2, 'baseline_seed', $3, 'running')`;
    return safeQuery(query, args);
  }

  static async query191(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_ack_campaigns
         (tenant_id, policy_id, title, due_date, created_by)
       VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '30 days', 'auto-fire')`;
    return safeQuery(query, args);
  }

  static async query192(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".governance_ack_campaigns
       WHERE policy_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query193(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title FROM "${schema}".policies
     WHERE status = 'approved' AND deleted_at IS NULL LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query194(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_policy_reviews
         (policy_id, reviewer_id, review_type, outcome, comments, next_review_date)
       VALUES ($1, $2, 'periodic', 'approved', $3, NOW() + INTERVAL '6 months')`;
    return safeQuery(query, args);
  }

  static async query195(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".governance_policy_reviews
       WHERE policy_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query196(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title FROM "${schema}".policies WHERE deleted_at IS NULL LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query197(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}"."${tableName}"
         (title, content, description, category, owner, linked_policy_id,
          review_frequency, sop_type, tags, effective_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)`;
    return safeQuery(query, args);
  }

  static async query198(schema: string, args: unknown[]) {
    const query = `SELECT policy_id FROM "${schema}".policies WHERE deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query199(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}"."${tableName}" WHERE title = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query200(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = 'procedures' LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query201(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".sop_procedures
         (process_type, stage_id, role_id, title_en, title_ar, steps_en, steps_ar,
          prerequisites, expected_output, sla_hours, version, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'active')`;
    return safeQuery(query, args);
  }

  static async query202(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".sop_procedures
       WHERE process_type = $1 AND stage_id = $2 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query203(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_raci_assignments
             (template_id, activity, role_or_user, raci_type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query204(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_raci_templates
         (template_id, tenant_id, name_en, name_ar, process_area, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`;
    return safeQuery(query, args);
  }

  static async query205(schema: string, args: unknown[]) {
    const query = `SELECT template_id FROM "${schema}".governance_raci_templates
       WHERE name_en = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query206(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".team_raci_assignments
           (scope_type, scope_id, team_id, raci_role, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query207(schema: string, args: unknown[]) {
    const query = `SELECT team_id, team_code FROM "${schema}".teams WHERE active = TRUE`;
    return safeQuery(query, args);
  }

  static async query208(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_responsibility_assignments
           (responsibility_id, assignee_type, assignee_id, scope_type, scope_id)
         VALUES ($1, 'team', $2, 'enterprise', 'all')
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query209(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_responsibilities
         (responsibility_id, tenant_id, title_en, title_ar, description, category, criticality)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query210(schema: string, args: unknown[]) {
    const query = `SELECT responsibility_id FROM "${schema}".governance_responsibilities
       WHERE title_en = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query211(schema: string, args: unknown[]) {
    const query = `SELECT team_id, team_code FROM "${schema}".teams WHERE active = TRUE`;
    return safeQuery(query, args);
  }

  static async query212(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".departments (bu_id, name_en, name_ar, code, head_user_id)
         SELECT $1, $2, $3, $4, $5
         WHERE NOT EXISTS (SELECT 1 FROM "${schema}".departments WHERE code = $4 AND deleted_at IS NULL)`;
    return safeQuery(query, args);
  }

  static async query213(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".business_units (bu_id, org_id, name_en, name_ar, code, status)
       SELECT $1, (SELECT org_id FROM "${schema}".organizations LIMIT 1), 'Main Business Unit', 'وحدة الأعمال الرئيسية', 'BU-01', 'active'
       WHERE NOT EXISTS (SELECT 1 FROM "${schema}".business_units WHERE deleted_at IS NULL)`;
    return safeQuery(query, args);
  }

  static async query214(schema: string, args: unknown[]) {
    const query = `SELECT bu_id FROM "${schema}".business_units WHERE deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query215(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".legal_entities (name_en, name_ar, entity_type, country, description)
       SELECT $1, $2, $3, $4, $5
       WHERE NOT EXISTS (SELECT 1 FROM "${schema}".legal_entities WHERE name_en = $1 AND deleted_at IS NULL)`;
    return safeQuery(query, args);
  }

  static async query216(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_reporting_lines
           (tenant_id, parent_body_id, child_body_id, relationship_type)
         VALUES ($1, $2, $3, 'reports_to')
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query217(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_bodies
         (body_id, tenant_id, domain_id, body_type, name_en, name_ar, description, chair_user_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`;
    return safeQuery(query, args);
  }

  static async query218(schema: string, args: unknown[]) {
    const query = `SELECT body_id FROM "${schema}".governance_bodies WHERE name_en = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query219(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_domains
         (domain_id, tenant_id, name_en, name_ar, description, owner_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query220(schema: string, args: unknown[]) {
    const query = `SELECT domain_id FROM "${schema}".governance_domains WHERE name_en = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query221(schema: string, args: unknown[]) {
    const query = `
        INSERT INTO "${'schema'}".governance_action_items
          (title_en, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
        VALUES
          ($1, $2, 'high', 'open', 'risk', $3::uuid, TRUE, NOW(), NOW())
        RETURNING action_id
      `;
    return safeQuery(query, args);
  }

  static async query222(schema: string, args: unknown[]) {
    const query = `
      INSERT INTO "${schema}".governance_action_items
        (title_en, title_ar, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES
        ($1, $2, $3, 'medium', 'open', 'evidence', $4::uuid, FALSE, NOW(), NOW())
      RETURNING action_id
    `;
    return safeQuery(query, args);
  }

  static async query223(schema: string, args: unknown[]) {
    const query = `
      SELECT e.evidence_id, e.title, e.expiry_date,
        (SELECT COUNT(*)::int FROM "${schema}".evidence_items e2 WHERE e2.control_id = e.control_id AND e2.deleted_at IS NULL) AS linked_controls
      FROM "${schema}".evidence_items e
      WHERE e.deleted_at IS NULL
        AND e.expiry_date IS NOT NULL
        AND e.expiry_date < NOW()
      ORDER BY e.expiry_date ASC
      LIMIT 50
    `;
    return safeQuery(query, args);
  }

  static async query224(schema: string, args: unknown[]) {
    const query = `
      SELECT action_id, title_en, priority, due_date, assigned_to
      FROM "${schema}".governance_action_items
      WHERE due_date < NOW() AND status NOT IN ('closed', 'completed', 'cancelled')
        AND deleted_at IS NULL
      ORDER BY due_date ASC LIMIT 10
    `;
    return safeQuery(query, args);
  }

  static async query225(schema: string, args: unknown[]) {
    const query = `
      SELECT log_id, rule_code, entity_type, severity, message, created_at
      FROM "${schema}".governance_enforcement_log
      WHERE auto_resolved = FALSE AND resolved_at IS NULL
        AND severity = 'violation'
      ORDER BY created_at DESC LIMIT 10
    `;
    return safeQuery(query, args);
  }

  static async query226(schema: string, args: unknown[]) {
    const query = `
      SELECT exception_id, title, risk_level, status, expiry_date
      FROM "${schema}".exceptions
      WHERE risk_level IN ('critical', 'high') AND status IN ('approved', 'active')
        AND deleted_at IS NULL
      ORDER BY expiry_date ASC NULLS LAST LIMIT 10
    `;
    return safeQuery(query, args);
  }

  static async query227(schema: string, args: unknown[]) {
    const query = `
      SELECT risk_id, risk_title, risk_level, risk_score, status
      FROM "${schema}".risks
      WHERE risk_level IN ('critical', 'high') AND status != 'closed'
        AND deleted_at IS NULL
      ORDER BY risk_score DESC NULLS LAST LIMIT 10
    `;
    return safeQuery(query, args);
  }

  static async query228(schema: string, args: unknown[]) {
    const query = `
      SELECT action_id, title_en, priority, status, source_type, created_at
      FROM "${schema}".governance_action_items
      WHERE board_attention = TRUE AND status NOT IN ('closed', 'completed', 'cancelled')
        AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 20
    `;
    return safeQuery(query, args);
  }

  static async query229(schema: string, args: unknown[]) {
    const query = `
      INSERT INTO "${schema}".governance_action_items
        (title_en, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES ($1, $2, $3, 'open', 'security', $4::uuid, $5, NOW(), NOW())
      RETURNING action_id
    `;
    return safeQuery(query, args);
  }

  static async query230(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".ethics_reports SET escalated_to_governance = TRUE, updated_at = NOW() WHERE report_id = $1`;
    return safeQuery(query, args);
  }

  static async query231(schema: string, args: unknown[]) {
    const query = `
      INSERT INTO "${schema}".governance_action_items
        (title_en, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES ($1, $2, $3, 'open', 'ethics', $4::uuid, $5, NOW(), NOW())
      RETURNING action_id
    `;
    return safeQuery(query, args);
  }

  static async query232(schema: string, args: unknown[]) {
    const query = `
      SELECT title, description FROM "${schema}".ethics_reports
      WHERE report_id = $1 AND deleted_at IS NULL LIMIT 1
    `;
    return safeQuery(query, args);
  }

  static async query233(schema: string, args: unknown[]) {
    const query = `
      INSERT INTO "${schema}".governance_action_items
        (title_en, description, priority, status, source_type, source_id, board_attention, escalation_level, created_at, updated_at)
      VALUES
        ($1, $2, 'critical', 'open', 'incident', $3::uuid, TRUE, 1, NOW(), NOW())
      RETURNING action_id
    `;
    return safeQuery(query, args);
  }

  static async query234(schema: string, args: unknown[]) {
    const query = `
      SELECT title, description FROM "${schema}".incidents
      WHERE incident_id = $1 AND deleted_at IS NULL LIMIT 1
    `;
    return safeQuery(query, args);
  }

  static async query235(schema: string, args: unknown[]) {
    const query = `
      INSERT INTO "${schema}".governance_action_items
        (title_en, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES
        ($1, $2, $3, 'open', 'audit', $4::uuid, $5, NOW(), NOW())
      RETURNING action_id
    `;
    return safeQuery(query, args);
  }

  static async query236(schema: string, args: unknown[]) {
    const query = `
      SELECT finding_title, finding_description FROM "${schema}".audit_findings
      WHERE finding_id = $1 AND deleted_at IS NULL LIMIT 1
    `;
    return safeQuery(query, args);
  }

  static async query237(schema: string, args: unknown[]) {
    const query = `
      INSERT INTO "${schema}".governance_action_items
        (title_en, title_ar, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, 'open', 'control', $5::uuid, $6, NOW(), NOW())
      RETURNING action_id
    `;
    return safeQuery(query, args);
  }

  static async query238(schema: string, args: unknown[]) {
    const query = `
      SELECT da.delegation_id, da.authority_type, da.scope
      FROM "${schema}".delegated_authorities da
      WHERE da.delegate_user_id = $1
        AND da.status = 'active'
        AND da.valid_from <= NOW()
        AND (da.valid_to IS NULL OR da.valid_to >= NOW())
        AND da.deleted_at IS NULL
        AND (da.authority_type ILIKE '%risk%' OR da.authority_type = 'all')
      LIMIT 1
    `;
    return safeQuery(query, args);
  }

  static async query239(schema: string, args: unknown[]) {
    const query = `
      SELECT decision_type, required_approver_role, min_criticality
      FROM "${schema}".authority_matrix
      WHERE decision_type IN ('risk_acceptance', 'risk_accept')
        AND is_active = TRUE
      LIMIT 1
    `;
    return safeQuery(query, args);
  }

  static async query240(schema: string, args: unknown[]) {
    const query = `SELECT task_id, title, due_date
     FROM "${schema}".remediation_tasks
     WHERE status NOT IN ('completed', 'overdue')
       AND due_date IS NOT NULL
       AND due_date <= CURRENT_DATE + INTERVAL '7 days'
     ORDER BY due_date ASC`;
    return safeQuery(query, args);
  }

  static async query241(schema: string, args: unknown[]) {
    const query = `SELECT assessment_id, title, updated_at
     FROM "${schema}".assessments
     WHERE status != 'completed'
       AND updated_at <= NOW() + INTERVAL '7 days'
     ORDER BY updated_at ASC`;
    return safeQuery(query, args);
  }

  static async query242(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) FILTER (WHERE attendance_status IN ('invited','confirmed','attended','absent','excused','proxy'))::int AS total_invited,
       COUNT(*) FILTER (WHERE attendance_status IN ('attended','proxy'))::int AS attended
     FROM "${schema}".governance_meeting_attendees
     WHERE meeting_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query243(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_meeting_attendees
     SET attendance_status = $3, updated_at = NOW()
     WHERE attendee_id = $1 AND meeting_id = $2 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query244(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_meeting_attendees
       (meeting_id, user_id, attendance_status, proxy_for_user_id, created_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (meeting_id, user_id) DO UPDATE
       SET attendance_status = COALESCE($3, governance_meeting_attendees.attendance_status),
           proxy_for_user_id = COALESCE($4, governance_meeting_attendees.proxy_for_user_id),
           updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query245(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_meeting_attendees
     WHERE meeting_id = $1 AND deleted_at IS NULL
     ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query246(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_action_items
     SET status = 'closed', closure_evidence = $2, updated_at = NOW()
     WHERE action_item_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query247(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_action_items
     SET escalation_level = COALESCE(escalation_level, 0) + 1, status = 'escalated', board_attention = TRUE, updated_at = NOW()
     WHERE action_item_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query248(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_action_updates WHERE action_item_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query249(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_action_updates
      (update_id, action_item_id, update_text, updated_by)
     VALUES ($1,$2,$3,$4)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query250(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_action_items SET ${sets.join(', ')}, updated_at = NOW()
     WHERE action_item_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query251(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_action_items
      (action_item_id, title, description, assigned_to, due_date, priority, status, source_type, source_id, board_attention, escalation_level, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,0,$10)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query252(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_action_items WHERE action_item_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query253(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query254(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".grc_plans WHERE plan_id = $1 RETURNING plan_id`;
    return safeQuery(query, args);
  }

  static async query255(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".grc_plans SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      policy_ids = COALESCE($3, policy_ids),
      control_ids = COALESCE($4, control_ids),
      assessment_ids = COALESCE($5, assessment_ids),
      vision_2030_tags = COALESCE($6, vision_2030_tags),
      status = COALESCE($7, status)
     WHERE plan_id = $8
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query256(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".grc_plans WHERE plan_id = $1`;
    return safeQuery(query, args);
  }

  static async query257(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".grc_plans ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query258(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".grc_plans
      (plan_id, title, description, policy_ids, control_ids, assessment_ids, vision_2030_tags, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query259(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".committees ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query260(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".committees SET
      name = COALESCE($1, name),
      purpose = COALESCE($2, purpose),
      members = COALESCE($3, members),
      meeting_schedule = COALESCE($4, meeting_schedule)
     WHERE committee_id = $5
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query261(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".committees (name, purpose, members, meeting_schedule)
     VALUES ($1,$2,$3,$4)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query262(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policies SET deleted_at = NOW(), updated_at = NOW() WHERE policy_id = $1 AND deleted_at IS NULL RETURNING policy_id`;
    return safeQuery(query, args);
  }

  static async query263(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policies WHERE policy_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query264(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policies WHERE deleted_at IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`;
    return safeQuery(query, args);
  }

  static async query265(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policies WHERE deleted_at IS NULL AND (author_user_id = $1 OR created_by = $1 OR owner = $1)
       ORDER BY updated_at DESC NULLS LAST, created_at DESC`;
    return safeQuery(query, args);
  }

  static async query266(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policies
      (policy_id, title, content, version, status, frameworks, owner, next_review_date, approval_status, author_user_id, created_by)
     VALUES ($1,$2,$3,1,'draft',$4,$5,$6,'draft',$5,$5)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query267(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".governance_items ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query268(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".governance_items ${where}`;
    return safeQuery(query, args);
  }

  static async query269(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_items WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query270(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_items WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query271(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_items WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query272(schema: string, args: unknown[]) {
    const query = `
          UPDATE "${schema}".governance_action_items
          SET priority = $2, updated_at = NOW()
          WHERE (item_id = $1 OR action_item_id = $1 OR id = $1)
        `;
    return safeQuery(query, args);
  }

  static async query273(schema: string, args: unknown[]) {
    const query = `
          INSERT INTO "${schema}".notifications (user_id, type, title, body, link, read, created_at)
          SELECT COALESCE(ai.assigned_to, ai.owner), 'escalation', $2, $3, '/governance/actions', FALSE, NOW()
          FROM "${schema}".governance_action_items ai
          WHERE (ai.item_id = $1 OR ai.action_item_id = $1 OR ai.id = $1)
            AND COALESCE(ai.assigned_to, ai.owner) IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM "${schema}".notifications n
              WHERE n.type = 'escalation' AND n.link = '/governance/actions'
                AND n.title = $2 AND n.created_at > NOW() - INTERVAL '24 hours'
            )
        `;
    return safeQuery(query, args);
  }

  static async query274(schema: string, args: unknown[]) {
    const query = `
          UPDATE "${schema}".governance_action_items
          SET escalation_state = 'escalated',
              priority = $2,
              board_attention = CASE WHEN $3::int >= 30 THEN TRUE ELSE COALESCE(board_attention, FALSE) END,
              updated_at = NOW()
          WHERE (item_id = $1 OR action_item_id = $1 OR id = $1)
        `;
    return safeQuery(query, args);
  }

  static async query275(schema: string, args: unknown[]) {
    const query = `
      SELECT ai.*, 
        EXTRACT(DAY FROM NOW() - COALESCE(ai.deadline, ai.due_date))::int AS days_overdue
      FROM "${schema}".governance_action_items ai
      WHERE ai.deleted_at IS NULL
        AND ai.status NOT IN ('completed','deleted','closed')
        AND COALESCE(ai.deadline, ai.due_date) IS NOT NULL
        AND COALESCE(ai.deadline, ai.due_date) < NOW()
    `;
    return safeQuery(query, args);
  }

  static async query276(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_auto_fire_log
       SET status = 'failed', completed_at = NOW(), error_message = $2
       WHERE fire_id = $1`;
    return safeQuery(query, args);
  }

  static async query277(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_auto_fire_log
       SET status = 'completed', completed_at = NOW(), components_fired = $2
       WHERE fire_id = $1`;
    return safeQuery(query, args);
  }

  static async query278(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_auto_fire_log
       (fire_id, tenant_id, fire_type, triggered_by, status)
     VALUES ($1, $2, 'scan_cycle', $3, 'running')`;
    return safeQuery(query, args);
  }

  static async query279(schema: string, args: unknown[]) {
    const query = `SELECT pack_id, title_en, meeting_date FROM "${schema}".board_packs
     WHERE status = 'draft' AND meeting_date < NOW() + INTERVAL '14 days'
       AND meeting_date > NOW() - INTERVAL '7 days'
     LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query280(schema: string, args: unknown[]) {
    const query = `SELECT objective_id, title_en, target_date, progress_percent
     FROM "${schema}".governance_objectives
     WHERE status IN ('at_risk','delayed')
       AND deleted_at IS NULL
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query281(schema: string, args: unknown[]) {
    const query = `SELECT exception_id, control_id, reason FROM "${schema}".control_exceptions
     WHERE valid_to < CURRENT_DATE AND status NOT IN ('closed','expired','revoked')
       AND deleted_at IS NULL
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query282(schema: string, args: unknown[]) {
    const query = `SELECT charter_id, title_en FROM "${schema}".governance_charters
     WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '60 days'
       AND status = 'active'
     LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query283(schema: string, args: unknown[]) {
    const query = `SELECT r.responsibility_id, r.title_en
     FROM "${schema}".governance_responsibilities r
     LEFT JOIN "${schema}".governance_responsibility_assignments a ON a.responsibility_id = r.responsibility_id
     WHERE r.deleted_at IS NULL AND r.criticality IN ('critical','high') AND a.assignment_id IS NULL
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query284(schema: string, args: unknown[]) {
    const query = `SELECT obligation_id, title_en FROM "${schema}".governance_obligations
     WHERE status = 'overdue' AND deleted_at IS NULL
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query285(schema: string, args: unknown[]) {
    const query = `SELECT delegation_id, authority_type, delegate_user_id
     FROM "${schema}".governance_delegations
     WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       AND status = 'active' AND deleted_at IS NULL
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query286(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_action_items
             (title, description, priority, status, source_type, board_attention, escalation_level, created_at)
           VALUES ($1, $2, 'high', 'open', 'governance_health', TRUE, 0, NOW())`;
    return safeQuery(query, args);
  }

  static async query287(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".governance_action_items
           WHERE title ILIKE $1
             AND status NOT IN ('completed','closed','cancelled')
             AND created_at > NOW() - INTERVAL '7 days'
           LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query288(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".governance_action_items
           WHERE source_type = 'governance_health' AND source_id = $1::UUID
             AND status NOT IN ('completed','closed','cancelled')
           LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query289(schema: string, args: unknown[]) {
    const query = `SELECT log_id, rule_code, entity_type, entity_id, severity, description
     FROM "${schema}".governance_enforcement_log
     WHERE resolved_at IS NULL AND severity = 'violation'
     LIMIT 30`;
    return safeQuery(query, args);
  }

  static async query290(schema: string, args: unknown[]) {
    const query = `SELECT mandate_id, title_en FROM "${schema}".governance_mandates
     WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
       AND status = 'active'
       AND deleted_at IS NULL
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query291(schema: string, args: unknown[]) {
    const query = `SELECT sop_id, title_en, process_type FROM "${schema}".sop_procedures
     WHERE updated_at < NOW() - INTERVAL '1 year'
       AND status = 'active'
     LIMIT 30`;
    return safeQuery(query, args);
  }

  static async query292(schema: string, args: unknown[]) {
    const query = `SELECT c.committee_id, c.name
     FROM "${schema}".committees c
     LEFT JOIN "${schema}".governance_meetings gm ON gm.committee_id = c.committee_id
       AND gm.scheduled_at > NOW() - INTERVAL '90 days'
     WHERE c.deleted_at IS NULL AND gm.meeting_id IS NULL
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query293(schema: string, args: unknown[]) {
    const query = `SELECT action_item_id, title FROM "${schema}".governance_action_items
     WHERE due_date < NOW() - INTERVAL '30 days'
       AND status NOT IN ('completed','closed','cancelled','verified')
       AND deleted_at IS NULL
     LIMIT 30`;
    return safeQuery(query, args);
  }

  static async query294(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".evidence_tasks et ON et.control_id = c.control_id::TEXT
       AND et.status = 'completed' AND et.completed_at > NOW() - INTERVAL '90 days'
     WHERE c.deleted_at IS NULL AND et.task_id IS NULL
     LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query295(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title FROM "${schema}".policies
     WHERE next_review_date < NOW()
       AND status NOT IN ('draft','archived')
       AND deleted_at IS NULL
     LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query296(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM "${schema}".process_tasks
     WHERE entity_type = $1 AND entity_id = $2 AND task_type = $3
       AND status NOT IN ('completed','cancelled','auto_closed')
       AND created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query297(schema: string, args: unknown[]) {
    const query = `SELECT assessment_id, level, aggregate, assessed_at
     FROM "${schema}".maturity_assessments
     ORDER BY assessed_at DESC
     LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query298(schema: string, args: unknown[]) {
    const query = `SELECT 
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
         FROM "${schema}".remediation_tasks`;
    return safeQuery(query, args);
  }

  static async query299(schema: string, args: unknown[]) {
    const query = `SELECT 
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status IN ('completed', 'closed', 'resolved'))::int AS effective
         FROM "${schema}".remediation_plans
         WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query300(schema: string, args: unknown[]) {
    const query = `SELECT 
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'closed' OR status = 'resolved')::int AS closed
       FROM "${schema}".findings
       WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query301(schema: string, args: unknown[]) {
    const query = `SELECT 
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE source_type IN ('system-generated', 'connector', 'pipeline'))::int AS automated,
       COUNT(*) FILTER (WHERE quality_tier = 'A')::int AS tier_a,
       COUNT(*) FILTER (WHERE quality_tier = 'B')::int AS tier_b,
       COUNT(*) FILTER (WHERE quality_tier = 'C')::int AS tier_c,
       COUNT(*) FILTER (WHERE expiry_date IS NULL OR expiry_date >= NOW())::int AS fresh,
       COUNT(*) FILTER (WHERE collected_at >= NOW() - INTERVAL '90 days')::int AS recently_collected
     FROM "${schema}".evidence
     WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query302(schema: string, args: unknown[]) {
    const query = `SELECT 
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'implemented' OR status = 'active')::int AS implemented,
       COUNT(*) FILTER (WHERE test_frequency IS NOT NULL AND test_frequency != 'manual' AND test_frequency != '')::int AS automated_testing,
       COUNT(*) FILTER (WHERE last_tested_at IS NOT NULL AND last_tested_at >= NOW() - INTERVAL '90 days')::int AS recently_tested,
       COALESCE(
         (SELECT AVG(overall_score * 100.0)::numeric FROM "${schema}".control_effectiveness_scores WHERE deleted_at IS NULL AND overall_score IS NOT NULL),
         AVG(CASE WHEN effectiveness IS NOT NULL THEN effectiveness::numeric ELSE NULL END),
         0
       ) AS avg_effectiveness
     FROM "${schema}".controls
     WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query303(schema: string, args: unknown[]) {
    const query = `SELECT 
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE owner IS NOT NULL AND owner != '' AND category IS NOT NULL AND treatment_plan IS NOT NULL)::int AS complete,
       COUNT(*) FILTER (WHERE treatment_status IS NOT NULL AND treatment_status != 'untreated')::int AS treated,
       COUNT(*) FILTER (WHERE kri_config IS NOT NULL AND kri_config != '{}'::jsonb)::int AS has_kri
     FROM "${schema}".risks
     WHERE status != 'closed'`;
    return safeQuery(query, args);
  }

  static async query304(schema: string, args: unknown[]) {
    const query = `SELECT 
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE approval_status = 'approved' OR status = 'approved' OR status = 'published')::int AS approved,
       COUNT(*) FILTER (WHERE next_review_date IS NOT NULL AND next_review_date >= NOW())::int AS review_scheduled,
       COUNT(*) FILTER (WHERE next_review_date IS NOT NULL AND next_review_date >= NOW() - INTERVAL '90 days')::int AS recently_reviewed
     FROM "${schema}".policies
     WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query305(schema: string, args: unknown[]) {
    const query = `
    SELECT
      p.policy_id,
      p.title AS policy_title,
      COUNT(a.ack_id)::int AS total,
      COUNT(a.acknowledged_at)::int AS acknowledged,
      ROUND(COUNT(a.acknowledged_at)::decimal / GREATEST(COUNT(a.ack_id), 1) * 100, 1) AS completion_pct,
      COUNT(*) FILTER (WHERE a.due_date < CURRENT_DATE AND a.acknowledged_at IS NULL)::int AS overdue
    FROM "${schema}".governance_policy_acknowledgements a
    JOIN "${schema}".policies p ON p.policy_id = a.policy_id
    GROUP BY p.policy_id, p.title
    ORDER BY completion_pct ASC
  `;
    return safeQuery(query, args);
  }

  static async query306(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_policy_acknowledgements
     SET acknowledged_at = NOW()
     WHERE ack_id = $1 AND user_id = $2 AND acknowledged_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query307(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_policy_acknowledgements
        (policy_id, user_id, campaign_id, due_date, version_acknowledged, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query308(schema: string, args: unknown[]) {
    const query = `
    SELECT
      a.campaign_id,
      a.policy_id,
      p.title AS policy_title,
      COUNT(*)::int AS total_recipients,
      COUNT(a.acknowledged_at)::int AS acknowledged_count,
      MIN(a.due_date) AS due_date,
      ROUND(COUNT(a.acknowledged_at)::decimal / GREATEST(COUNT(*), 1) * 100, 1) AS completion_pct
    FROM "${schema}".governance_policy_acknowledgements a
    LEFT JOIN "${schema}".policies p ON p.policy_id = a.policy_id
    WHERE a.campaign_id IS NOT NULL
    GROUP BY a.campaign_id, a.policy_id, p.title
    ORDER BY due_date ASC NULLS LAST
  `;
    return safeQuery(query, args);
  }

  static async query309(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query310(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".board_packs SET status = 'published', updated_at = NOW()
     WHERE pack_id = $1 AND deleted_at IS NULL AND status = 'approved' RETURNING *`;
    return safeQuery(query, args);
  }

  static async query311(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".board_packs SET status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
     WHERE pack_id = $1 AND deleted_at IS NULL AND status = 'review' RETURNING *`;
    return safeQuery(query, args);
  }

  static async query312(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".board_packs SET status = 'review', updated_at = NOW() WHERE pack_id = $1`;
    return safeQuery(query, args);
  }

  static async query313(schema: string, args: unknown[]) {
    const query = `SELECT action_item_id, title, due_date, status FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND due_date < CURRENT_DATE AND status NOT IN ('completed','closed','cancelled','verified') ORDER BY due_date LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query314(schema: string, args: unknown[]) {
    const query = `SELECT rule_code, entity_type, severity, message FROM "${schema}".governance_enforcement_log WHERE tenant_id = $1 AND resolved_at IS NULL AND severity = 'violation' ORDER BY created_at DESC LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query315(schema: string, args: unknown[]) {
    const query = `SELECT exception_id, title, risk_level, status, expiry_date FROM "${schema}".exceptions WHERE deleted_at IS NULL AND status NOT IN ('expired','closed','rejected') AND risk_level IN ('high','critical') ORDER BY created_at DESC LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query316(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title, risk_score, status FROM "${schema}".risks WHERE deleted_at IS NULL ORDER BY risk_score DESC NULLS LAST LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query317(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_health_scores WHERE tenant_id = $1 ORDER BY computed_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query318(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".board_packs SET status = 'assembling', updated_at = NOW() WHERE pack_id = $1`;
    return safeQuery(query, args);
  }

  static async query319(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".board_pack_items WHERE item_id = $1 RETURNING item_id`;
    return safeQuery(query, args);
  }

  static async query320(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_pack_items (item_id, pack_id, item_type, title_en, title_ar, content, sort_order, source_entity_type, source_entity_id, auto_generated)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query321(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".board_packs SET
       title_en = COALESCE($2, title_en), title_ar = COALESCE($3, title_ar),
       pack_type = COALESCE($4, pack_type), period_start = COALESCE($5, period_start),
       period_end = COALESCE($6, period_end), narrative = COALESCE($7, narrative), updated_at = NOW()
     WHERE pack_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query322(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_packs (pack_id, tenant_id, title_en, title_ar, pack_type, period_start, period_end, narrative, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query323(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".board_pack_items WHERE pack_id = $1 ORDER BY sort_order, created_at`;
    return safeQuery(query, args);
  }

  static async query324(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".board_packs WHERE pack_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query325(schema: string, args: unknown[]) {
    const query = `SELECT p.*, (SELECT COUNT(*)::int FROM "${schema}".board_pack_items i WHERE i.pack_id = p.pack_id) AS item_count
     FROM "${schema}".board_packs p WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query326(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_charters
     WHERE committee_id = $1 AND deleted_at IS NULL AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query327(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_charters SET
       status = 'active', effective_date = COALESCE(effective_date, CURRENT_DATE), updated_at = NOW()
     WHERE charter_id = $1 AND deleted_at IS NULL AND status = 'approved'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query328(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_charters SET
       status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
     WHERE charter_id = $1 AND deleted_at IS NULL AND status IN ('draft','in_review')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query329(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_charters SET
       title_en = COALESCE($2, title_en), title_ar = COALESCE($3, title_ar),
       charter_text = COALESCE($4, charter_text), committee_id = COALESCE($5, committee_id),
       body_id = COALESCE($6, body_id), owner_id = COALESCE($7, owner_id),
       effective_date = COALESCE($8, effective_date), expiry_date = COALESCE($9, expiry_date),
       review_date = COALESCE($10, review_date), updated_at = NOW()
     WHERE charter_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query330(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_charters
       (charter_id, tenant_id, title_en, title_ar, charter_text, committee_id, body_id,
        owner_id, effective_date, expiry_date, review_date, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft',$12)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query331(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_charters WHERE charter_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query332(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query333(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".escalation_thresholds (level, timeout_hours, notify_role, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (level) DO UPDATE SET
         timeout_hours = $2, notify_role = $3, updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query334(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".escalation_thresholds ORDER BY level`;
    return safeQuery(query, args);
  }

  static async query335(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".authority_matrix WHERE rule_id = $1`;
    return safeQuery(query, args);
  }

  static async query336(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".authority_matrix
           (decision_type, min_criticality, required_approver_role, escalation_timeout_hours)
         VALUES ($1, $2, $3, $4)`;
    return safeQuery(query, args);
  }

  static async query337(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".authority_matrix SET
           decision_type = $1, min_criticality = $2,
           required_approver_role = $3, escalation_timeout_hours = $4
         WHERE rule_id = $5`;
    return safeQuery(query, args);
  }

  static async query338(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".authority_matrix ORDER BY decision_type, min_criticality`;
    return safeQuery(query, args);
  }

  static async query339(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_risk_appetite
         (category, max_residual_score, acceptance_requires_role, review_cadence_days, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (category) DO UPDATE SET
         max_residual_score = $2,
         acceptance_requires_role = $3,
         review_cadence_days = $4,
         updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query340(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_risk_appetite ORDER BY category`;
    return safeQuery(query, args);
  }

  static async query341(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE severity = 'violation')::int AS violations,
       COUNT(*) FILTER (WHERE severity = 'warning')::int AS warnings,
       COUNT(*) FILTER (WHERE severity = 'info')::int AS info,
       COUNT(*) FILTER (WHERE resolved_at IS NULL)::int AS unresolved
     FROM "${schema}".governance_enforcement_log
     WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query342(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_enforcement_log
     SET resolved_at = NOW(), resolved_by = $2
     WHERE log_id = $1 AND resolved_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query343(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query344(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_enforcement_log
           (log_id, tenant_id, rule_code, entity_type, entity_id, severity, message)
         VALUES ($1, $2, $3, $4, $5::uuid, $6, $7)
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query345(schema: string, args: unknown[]) {
    const query = `SELECT c.charter_id, c.title_en
     FROM "${schema}".governance_charters c
     WHERE c.deleted_at IS NULL AND c.expiry_date IS NOT NULL
       AND c.expiry_date < CURRENT_DATE
       AND c.status NOT IN ('expired','archived')`;
    return safeQuery(query, args);
  }

  static async query346(schema: string, args: unknown[]) {
    const query = `SELECT e.exception_id, COALESCE(e.title, 'Exception ' || e.exception_id) AS title
     FROM "${schema}".exceptions e
     WHERE e.deleted_at IS NULL AND e.status = 'approved'
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".governance_compensating_controls cc
         WHERE cc.exception_id = e.exception_id AND cc.deleted_at IS NULL
       )`;
    return safeQuery(query, args);
  }

  static async query347(schema: string, args: unknown[]) {
    const query = `SELECT a.action_item_id, a.title
     FROM "${schema}".governance_action_items a
     WHERE a.deleted_at IS NULL AND a.due_date IS NOT NULL
       AND a.due_date < CURRENT_DATE
       AND a.status NOT IN ('completed','closed','cancelled','verified')`;
    return safeQuery(query, args);
  }

  static async query348(schema: string, args: unknown[]) {
    const query = `SELECT d.delegation_id, d.authority_type
     FROM "${schema}".delegated_authorities d
     WHERE d.deleted_at IS NULL AND d.valid_to IS NOT NULL
       AND d.valid_to < CURRENT_DATE
       AND d.status NOT IN ('expired','revoked')`;
    return safeQuery(query, args);
  }

  static async query349(schema: string, args: unknown[]) {
    const query = `SELECT m.mandate_id, m.title_en
     FROM "${schema}".governance_mandates m
     WHERE m.deleted_at IS NULL AND m.expiry_date IS NOT NULL
       AND m.expiry_date < CURRENT_DATE
       AND m.status NOT IN ('expired','archived')`;
    return safeQuery(query, args);
  }

  static async query350(schema: string, args: unknown[]) {
    const query = `SELECT p.policy_id, p.title
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL AND p.next_review_date IS NOT NULL
       AND p.next_review_date < CURRENT_DATE
       AND p.status NOT IN ('draft','archived')`;
    return safeQuery(query, args);
  }

  static async query351(schema: string, args: unknown[]) {
    const query = `SELECT d.decision_id, d.decision_text
     FROM "${schema}".governance_decisions d
     WHERE d.deleted_at IS NULL
       AND (d.decision_text IS NULL OR LENGTH(d.decision_text) < 10)
       AND d.created_at >= NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query352(schema: string, args: unknown[]) {
    const query = `SELECT m.meeting_id, m.title
     FROM "${schema}".governance_meetings m
     WHERE m.deleted_at IS NULL AND m.status = 'completed'
       AND (m.minutes IS NULL OR m.minutes = '')
       AND m.scheduled_at >= NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query353(schema: string, args: unknown[]) {
    const query = `SELECT t.team_id AS committee_id, t.name_en AS name
     FROM "${schema}".teams t
     WHERE t.committee_type IS NOT NULL AND t.active = TRUE AND t.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".governance_charters ch
         WHERE ch.committee_id = t.team_id AND ch.status = 'active' AND ch.deleted_at IS NULL
       )`;
    return safeQuery(query, args);
  }

  static async query354(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_mandate_sources SET deleted_at = NOW() WHERE source_id = $1 AND deleted_at IS NULL RETURNING source_id`;
    return safeQuery(query, args);
  }

  static async query355(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_mandate_sources
      (mandate_id, source_type, source_name, source_url, document_ref, published_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query356(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_mandate_sources WHERE mandate_id = $1 AND deleted_at IS NULL ORDER BY published_at DESC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query357(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_mandates SET deleted_at = NOW() WHERE mandate_id = $1 AND deleted_at IS NULL RETURNING mandate_id`;
    return safeQuery(query, args);
  }

  static async query358(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_mandates SET ${sets.join(', ')}, updated_at = NOW()
     WHERE mandate_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query359(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_mandates
      (mandate_id, title_en, title_ar, description, source_type, source_reference,
       issuing_authority, effective_date, expiry_date, status, priority, jurisdiction,
       owner_id, review_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query360(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_mandates WHERE mandate_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query361(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query362(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_registers SET deleted_at = NOW() WHERE register_id = $1 AND deleted_at IS NULL RETURNING register_id`;
    return safeQuery(query, args);
  }

  static async query363(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_registers SET ${sets.join(', ')}, updated_at = NOW()
     WHERE register_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query364(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_registers
      (register_id, register_type, name_en, name_ar, description, owner_id, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query365(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_registers WHERE register_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query366(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query367(schema: string, args: unknown[]) {
    const query = `
    SELECT 'policy' AS entity_type, p.policy_id AS entity_id, p.title AS entity_name
    FROM "${schema}".policies p
    WHERE p.deleted_at IS NULL AND (p.owner IS NULL OR p.owner = '')
    UNION ALL
    SELECT 'risk' AS entity_type, r.risk_id::text AS entity_id, r.title AS entity_name
    FROM "${schema}".risks r
    WHERE r.deleted_at IS NULL AND (r.owner IS NULL OR r.owner = '')
    UNION ALL
    SELECT 'control' AS entity_type, c.control_id AS entity_id, c.title AS entity_name
    FROM "${schema}".controls c
    WHERE c.deleted_at IS NULL AND (c.owner IS NULL OR c.owner = '')
    ORDER BY entity_type, entity_name
  `;
    return safeQuery(query, args);
  }

  static async query368(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_responsibility_assignments SET deleted_at = NOW() WHERE assignment_id = $1 AND deleted_at IS NULL RETURNING assignment_id`;
    return safeQuery(query, args);
  }

  static async query369(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_responsibility_assignments
      (assignment_id, responsibility_id, assignee_id, assignee_type, scope_type, scope_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query370(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query371(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_responsibilities SET ${sets.join(', ')}, updated_at = NOW()
     WHERE responsibility_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query372(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_responsibilities
      (responsibility_id, title_en, title_ar, description, category, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query373(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_responsibilities WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query374(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_policy_reviews SET deleted_at = NOW(), updated_by = $2 WHERE review_id = $1 AND deleted_at IS NULL RETURNING review_id`;
    return safeQuery(query, args);
  }

  static async query375(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_policy_reviews SET ${sets.join(', ')}, updated_at = NOW(), updated_by = $${fields.length + 2}
     WHERE review_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query376(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_policy_reviews
      (policy_id, reviewer_id, review_type, outcome, comments, next_review_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query377(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_policy_reviews WHERE review_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query378(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_policy_reviews
     WHERE deleted_at IS NULL AND next_review_date IS NOT NULL
       AND next_review_date < NOW() AND outcome NOT IN ('approved')
     ORDER BY next_review_date`;
    return safeQuery(query, args);
  }

  static async query379(schema: string, args: unknown[]) {
    const query = `SELECT r.*, (r.next_review_date IS NOT NULL AND r.next_review_date < NOW()) AS overdue
     FROM "${schema}".governance_policy_reviews r
     WHERE r.deleted_at IS NULL AND r.outcome IN ('pending','needs_revision')
     ORDER BY r.next_review_date ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query380(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query381(schema: string, args: unknown[]) {
    const query = `
      SELECT * FROM "${schema}".governance_decisions
      WHERE owner = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 50
    `;
    return safeQuery(query, args);
  }

  static async query382(schema: string, args: unknown[]) {
    const query = `
      SELECT * FROM "${schema}".governance_action_items
      WHERE assigned_to = $1 AND deleted_at IS NULL
      ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, due_date ASC NULLS LAST
    `;
    return safeQuery(query, args);
  }

  static async query383(schema: string, args: unknown[]) {
    const query = `
      SELECT source_type AS module,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('closed','completed','cancelled'))::int AS open
      FROM "${schema}".governance_action_items
      WHERE deleted_at IS NULL
      GROUP BY source_type
      ORDER BY open DESC
    `;
    return safeQuery(query, args);
  }

  static async query384(schema: string, args: unknown[]) {
    const query = `
      SELECT COALESCE(assigned_to, 'unassigned') AS owner,
        COUNT(*)::int AS overdue_count,
        MIN(due_date) AS earliest_due
      FROM "${schema}".governance_action_items
      WHERE deleted_at IS NULL
        AND due_date < NOW()
        AND status NOT IN ('closed','completed','cancelled')
      GROUP BY COALESCE(assigned_to, 'unassigned')
      ORDER BY overdue_count DESC
    `;
    return safeQuery(query, args);
  }

  static async query385(schema: string, args: unknown[]) {
    const query = `
      SELECT gd.committee_id, t.name_en AS committee_name,
        COUNT(*)::int AS total_decisions,
        COUNT(*) FILTER (WHERE gd.status = 'pending')::int AS pending
      FROM "${schema}".governance_decisions gd
      LEFT JOIN "${schema}".teams t ON t.team_id = gd.committee_id AND t.committee_type IS NOT NULL
      WHERE gd.deleted_at IS NULL
      GROUP BY gd.committee_id, t.name_en
      ORDER BY pending DESC
    `;
    return safeQuery(query, args);
  }

  static async query386(schema: string, args: unknown[]) {
    const query = `
      SELECT COALESCE(assigned_to, 'unassigned') AS owner,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('closed','completed','cancelled'))::int AS open,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed','completed','cancelled'))::int AS overdue
      FROM "${schema}".governance_action_items
      WHERE deleted_at IS NULL
      GROUP BY COALESCE(assigned_to, 'unassigned')
      ORDER BY open DESC
    `;
    return safeQuery(query, args);
  }

  static async query387(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE assignee_id IS NOT NULL)::int AS assigned,
         COUNT(*) FILTER (WHERE assignee_id IS NULL)::int AS unassigned,
         COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'closed'))::int AS overdue,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         ROUND(
           COUNT(*) FILTER (WHERE assignee_id IS NOT NULL)::numeric /
           NULLIF(COUNT(*), 0) * 100, 1
         ) AS coverage_pct
       FROM "${schema}".governance_responsibility_assignments WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query388(schema: string, args: unknown[]) {
    const query = `SELECT gb.body_id, gb.name_en, gb.body_type, gb.status, gb.owner_id,
         (SELECT COUNT(*)::int FROM "${schema}".governance_committee_members gcm
          WHERE gcm.body_id = gb.body_id AND gcm.status = 'active' AND gcm.deleted_at IS NULL) AS member_count,
         (SELECT COUNT(*)::int FROM "${schema}".governance_responsibility_assignments gra
          WHERE gra.body_id = gb.body_id AND gra.status NOT IN ('completed', 'closed') AND gra.deleted_at IS NULL) AS open_responsibilities,
         (SELECT MAX(meeting_date) FROM "${schema}".governance_meetings gm
          WHERE gm.body_id = gb.body_id AND gm.deleted_at IS NULL) AS last_meeting
       FROM "${schema}".governance_bodies gb
       WHERE gb.body_type = 'committee' AND gb.deleted_at IS NULL
       ORDER BY gb.name_en`;
    return safeQuery(query, args);
  }

  static async query389(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS expiring
         FROM "${schema}".governance_charters
         WHERE status = 'active' AND expiry_date IS NOT NULL
           AND expiry_date < NOW() + INTERVAL '30 days'
           AND expiry_date > NOW()
           AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query390(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FILTER (WHERE status IN ('draft', 'assembling', 'review'))::int AS pending
         FROM "${schema}".governance_board_packs WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query391(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*) FILTER (WHERE is_active = TRUE AND valid_to > NOW())::int AS active,
           COUNT(*) FILTER (WHERE is_active = TRUE AND valid_to <= NOW())::int AS expired
         FROM "${schema}".delegations`;
    return safeQuery(query, args);
  }

  static async query392(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*) FILTER (WHERE status IN ('pending', 'in_review'))::int AS pending,
           COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked
         FROM "${schema}".governance_reviews WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query393(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE assignee_id IS NOT NULL)::int AS assigned,
           COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'closed'))::int AS overdue
         FROM "${schema}".governance_responsibility_assignments WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query394(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS active
         FROM "${schema}".governance_committee_members
         WHERE status = 'active' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query395(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE body_type = 'committee')::int AS committees
         FROM "${schema}".governance_bodies WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query396(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_executive_summaries SET deleted_at=NOW() WHERE summary_id=$1 AND deleted_at IS NULL RETURNING summary_id`;
    return safeQuery(query, args);
  }

  static async query397(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_executive_summaries (tenant_id, title_en, period_start, period_end, summary_type, content, highlights, key_risks, key_decisions, prepared_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query398(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".governance_enforcement_log WHERE status='open' AND tenant_id=$1`;
    return safeQuery(query, args);
  }

  static async query399(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".governance_decisions WHERE deleted_at IS NULL AND status IN ('draft','pending_vote')`;
    return safeQuery(query, args);
  }

  static async query400(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".exceptions WHERE deleted_at IS NULL AND status IN ('open','approved') AND (severity='high' OR severity='critical')`;
    return safeQuery(query, args);
  }

  static async query401(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND due_date < NOW() AND status NOT IN ('completed','closed')`;
    return safeQuery(query, args);
  }

  static async query402(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_health_scores WHERE tenant_id=$1 ORDER BY computed_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query403(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_executive_summaries SET status='published', published_at=NOW(), updated_at=NOW() WHERE summary_id=$1 AND status='approved' AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query404(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_executive_summaries SET status='approved', approved_by=$2, approved_at=NOW(), updated_at=NOW() WHERE summary_id=$1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query405(schema: string, args: unknown[]) {
    const query = `SELECT status, created_by FROM "${schema}".governance_executive_summaries WHERE summary_id = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query406(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_executive_summaries SET title_en=COALESCE($2,title_en), title_ar=COALESCE($3,title_ar), period_start=COALESCE($4,period_start), period_end=COALESCE($5,period_end), summary_type=COALESCE($6,summary_type), highlights=COALESCE($7,highlights), key_risks=COALESCE($8,key_risks), key_decisions=COALESCE($9,key_decisions), recommendations=COALESCE($10,recommendations), updated_at=NOW() WHERE summary_id=$1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query407(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_executive_summaries (tenant_id, title_en, title_ar, period_start, period_end, summary_type, highlights, key_risks, key_decisions, recommendations, prepared_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query408(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_executive_summaries WHERE summary_id=$1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query409(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query410(schema: string, args: unknown[]) {
    const query = `SELECT ${selectCols} FROM "${schema}".${config.table}
     WHERE ${config.idCol} = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query411(schema: string, args: unknown[]) {
    const query = `SELECT ${targetConfig.idCol} AS source_id, ${rel.fkCol} AS target_id
       FROM "${schema}".${rel.sourceTable}
       WHERE ${rel.fkCol} IS NOT NULL AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query412(schema: string, args: unknown[]) {
    const query = `SELECT ${rel.fkCol} AS source_id, ${targetFkCol} AS target_id
       FROM "${schema}".${rel.sourceTable}`;
    return safeQuery(query, args);
  }

  static async query413(schema: string, args: unknown[]) {
    const query = `SELECT ${selectCols} FROM "${schema}".${config.table} WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query414(schema: string, args: unknown[]) {
    const query = `SELECT action_item_id, title, status, due_date FROM "${schema}".governance_action_items
       WHERE deleted_at IS NULL AND board_attention = TRUE AND status NOT IN ('completed','closed','cancelled','verified')
       ORDER BY due_date LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query415(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_health_thresholds (tenant_id, dimension, green_min, yellow_min, weight)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, dimension) DO UPDATE SET
         green_min = COALESCE($3, governance_health_thresholds.green_min),
         yellow_min = COALESCE($4, governance_health_thresholds.yellow_min),
         weight = COALESCE($5, governance_health_thresholds.weight)`;
    return safeQuery(query, args);
  }

  static async query416(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_health_thresholds WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query417(schema: string, args: unknown[]) {
    const query = `SELECT score_id, overall_score, overall_grade, dimension_scores, computed_at
     FROM "${schema}".governance_health_scores
     WHERE tenant_id = $1 AND computed_at >= NOW() - ($2 || ' days')::interval
     ORDER BY computed_at DESC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query418(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_health_scores WHERE tenant_id = $1 ORDER BY computed_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query419(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_health_scores
         (score_id, tenant_id, overall_score, overall_grade, dimension_scores, dimension_details, computed_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'api')`;
    return safeQuery(query, args);
  }

  static async query420(schema: string, args: unknown[]) {
    const query = `SELECT dimension, green_min, yellow_min, weight FROM "${schema}".governance_health_thresholds WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query421(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND next_review_date IS NOT NULL AND status NOT IN ('draft','archived')`;
    return safeQuery(query, args);
  }

  static async query422(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND next_review_date IS NOT NULL AND next_review_date < CURRENT_DATE AND status NOT IN ('draft','archived')`;
    return safeQuery(query, args);
  }

  static async query423(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_mandates WHERE deleted_at IS NULL AND owner_id IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query424(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_mandates WHERE deleted_at IS NULL AND expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE AND status NOT IN ('expired','archived')`;
    return safeQuery(query, args);
  }

  static async query425(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_mandates WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query426(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND due_date < CURRENT_DATE AND status NOT IN ('completed','closed','cancelled','verified')`;
    return safeQuery(query, args);
  }

  static async query427(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND status NOT IN ('completed','closed','cancelled','verified')`;
    return safeQuery(query, args);
  }

  static async query428(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".exceptions WHERE deleted_at IS NULL AND expiry_date < CURRENT_DATE AND status NOT IN ('expired','closed','rejected')`;
    return safeQuery(query, args);
  }

  static async query429(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".exceptions WHERE deleted_at IS NULL AND risk_level IN ('high','critical') AND status NOT IN ('expired','closed','rejected')`;
    return safeQuery(query, args);
  }

  static async query430(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".exceptions WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query431(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_decisions WHERE deleted_at IS NULL AND assigned_to IS NOT NULL AND created_at >= NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query432(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_decisions WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query433(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_meetings WHERE deleted_at IS NULL AND status = 'completed' AND minutes IS NOT NULL AND minutes != '' AND scheduled_at >= NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query434(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_meetings WHERE deleted_at IS NULL AND status = 'completed' AND scheduled_at >= NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query435(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND status NOT IN ('draft','archived')`;
    return safeQuery(query, args);
  }

  static async query436(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND (owner IS NULL OR owner = '') AND status NOT IN ('draft','archived')`;
    return safeQuery(query, args);
  }

  static async query437(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_policy_acknowledgements WHERE acknowledged_at IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query438(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".governance_policy_acknowledgements WHERE 1=1`;
    return safeQuery(query, args);
  }

  static async query439(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND next_review_date IS NOT NULL AND next_review_date >= CURRENT_DATE AND status NOT IN ('draft','archived')`;
    return safeQuery(query, args);
  }

  static async query440(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND status NOT IN ('draft','archived')`;
    return safeQuery(query, args);
  }

  static async query441(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_objectives SET deleted_at = NOW(), updated_by = $2 WHERE objective_id = $1 AND deleted_at IS NULL RETURNING objective_id`;
    return safeQuery(query, args);
  }

  static async query442(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_objectives SET ${sets.join(', ')}, updated_at = NOW(), updated_by = $${fields.length + 2}
     WHERE objective_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query443(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_objectives
      (title_en, title_ar, description, category, target_date, owner_id, parent_objective_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query444(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_objectives WHERE parent_objective_id = $1 AND deleted_at IS NULL ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query445(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_objectives WHERE objective_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query446(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_objectives WHERE deleted_at IS NULL ORDER BY parent_objective_id NULLS FIRST, created_at`;
    return safeQuery(query, args);
  }

  static async query447(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query448(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_obligation_exemptions
      (exemption_id, obligation_id, reason, requested_by, status, expiry_date)
     VALUES ($1,$2,$3,$4,'pending',$5)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query449(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_obligation_control_links
      (link_id, obligation_id, control_id, mapping_type, coverage_percent, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query450(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_obligation_control_links WHERE obligation_id = $1 ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query451(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_obligation_evidence_links
      (link_id, obligation_id, evidence_id, link_type, sufficiency_score, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query452(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_obligation_evidence_links WHERE obligation_id = $1 ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query453(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_obligation_due_dates SET status = 'completed', completed_at = NOW(), updated_at = NOW()
     WHERE due_date_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query454(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_obligation_due_dates WHERE obligation_id = $1 ORDER BY due_date`;
    return safeQuery(query, args);
  }

  static async query455(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_obligation_assignments
      (assignment_id, obligation_id, assignee_id, assignee_type, role, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query456(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_obligations SET ${sets.join(', ')}, updated_at = NOW()
     WHERE obligation_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query457(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_obligations
      (obligation_id, mandate_id, title_en, title_ar, description, obligation_type, frequency, owner_id, status, priority, compliance_deadline, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query458(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_obligation_due_dates WHERE obligation_id = $1 ORDER BY due_date`;
    return safeQuery(query, args);
  }

  static async query459(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_obligation_assignments WHERE obligation_id = $1 AND deleted_at IS NULL ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query460(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_obligation_versions WHERE obligation_id = $1 ORDER BY version_number DESC`;
    return safeQuery(query, args);
  }

  static async query461(schema: string, args: unknown[]) {
    const query = `SELECT o.*, m.title_en AS mandate_title
     FROM "${schema}".governance_obligations o
     LEFT JOIN "${schema}".governance_mandates m ON m.mandate_id = o.mandate_id
     WHERE o.obligation_id = $1 AND o.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query462(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query463(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".raci_templates SET status = 'archived', updated_at = NOW() WHERE template_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query464(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".raci_templates SET status = 'active', updated_at = NOW() WHERE template_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query465(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".raci_assignments (assignment_id, template_id, activity_name, role_name, raci_type)
       VALUES ($1, $2, $3, $4, $5)`;
    return safeQuery(query, args);
  }

  static async query466(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".raci_assignments WHERE template_id = $1`;
    return safeQuery(query, args);
  }

  static async query467(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".raci_templates SET ${sets.join(', ')}, updated_at = NOW()
     WHERE template_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query468(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".raci_templates
      (template_id, name_en, name_ar, description, scope_type, status, created_by)
     VALUES ($1,$2,$3,$4,$5,'draft',$6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query469(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".raci_assignments WHERE template_id = $1 ORDER BY activity_name, role_name`;
    return safeQuery(query, args);
  }

  static async query470(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".raci_templates WHERE template_id = $1`;
    return safeQuery(query, args);
  }

  static async query471(schema: string, args: unknown[]) {
    const query = `SELECT t.*,
      (SELECT COUNT(*) FROM "${schema}".raci_assignments a WHERE a.template_id = t.template_id)::int AS assignment_count
     FROM "${schema}".raci_templates t
     ORDER BY t.status, t.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query472(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_raci_templates SET status='archived', updated_at=NOW() WHERE template_id=$1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query473(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_raci_templates SET status='active', updated_at=NOW() WHERE template_id=$1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query474(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_raci_assignments WHERE template_id=$1 ORDER BY activity, raci_type`;
    return safeQuery(query, args);
  }

  static async query475(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_raci_templates SET name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar), process_area=COALESCE($4,process_area), updated_at=NOW() WHERE template_id=$1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query476(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_raci_templates (tenant_id, name_en, name_ar, process_area, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query477(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_raci_assignments WHERE template_id=$1 ORDER BY activity, raci_type`;
    return safeQuery(query, args);
  }

  static async query478(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_raci_templates WHERE template_id=$1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query479(schema: string, args: unknown[]) {
    const query = `SELECT d.delegator_user_id, d.delegate_user_id, d.authority_type,
            'Delegation creates dual-authority' AS conflict_reason
     FROM "${schema}".governance_delegations d
     WHERE d.status = 'active' AND d.deleted_at IS NULL
       AND d.delegator_user_id = d.delegate_user_id LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query480(schema: string, args: unknown[]) {
    const query = `SELECT r1.activity, r1.role_or_user, r1.raci_type AS type_1, r2.raci_type AS type_2,
            rt.name_en AS template_name
     FROM "${schema}".governance_raci_assignments r1
     JOIN "${schema}".governance_raci_assignments r2
       ON r1.template_id = r2.template_id AND r1.activity = r2.activity
       AND r1.role_or_user = r2.role_or_user
       AND r1.raci_type = 'R' AND r2.raci_type = 'A'
     JOIN "${schema}".governance_raci_templates rt ON rt.template_id = r1.template_id
     WHERE rt.status = 'active' AND rt.deleted_at IS NULL
     ORDER BY rt.name_en, r1.activity`;
    return safeQuery(query, args);
  }

  static async query481(schema: string, args: unknown[]) {
    const query = `SELECT c.committee_id AS entity_id, 'committee' AS entity_type, c.name AS entity_name
     FROM "${schema}".committees c
     LEFT JOIN "${schema}".governance_committee_members m ON m.committee_id = c.committee_id AND m.is_chair = TRUE AND m.deleted_at IS NULL
     WHERE c.deleted_at IS NULL AND m.member_id IS NULL LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query482(schema: string, args: unknown[]) {
    const query = `SELECT policy_id AS entity_id, 'policy' AS entity_type, title AS entity_name
     FROM "${schema}".policies
     WHERE (owner IS NULL OR owner = '') AND deleted_at IS NULL LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query483(schema: string, args: unknown[]) {
    const query = `SELECT ra.activity, rt.name_en AS template_name, rt.process_area,
            array_agg(DISTINCT ra.raci_type) AS assigned_types
     FROM "${schema}".governance_raci_assignments ra
     JOIN "${schema}".governance_raci_templates rt ON rt.template_id = ra.template_id
     WHERE rt.status = 'active' AND rt.deleted_at IS NULL
     GROUP BY ra.activity, rt.name_en, rt.process_area
     HAVING NOT ('A' = ANY(array_agg(DISTINCT ra.raci_type)))
     ORDER BY rt.process_area, ra.activity`;
    return safeQuery(query, args);
  }

  static async query484(schema: string, args: unknown[]) {
    const query = `SELECT ra.activity, ra.role_or_user, ra.raci_type, rt.name_en AS template_name, rt.process_area
       FROM "${schema}".governance_raci_assignments ra
       JOIN "${schema}".governance_raci_templates rt ON rt.template_id = ra.template_id
       WHERE rt.status = 'active' AND rt.deleted_at IS NULL
       ORDER BY rt.process_area, ra.activity, ra.raci_type`;
    return safeQuery(query, args);
  }

  static async query485(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_raci_templates WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query486(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_reporting_lines WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query487(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_bodies WHERE deleted_at IS NULL ORDER BY name_en`;
    return safeQuery(query, args);
  }

  static async query488(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_domains WHERE deleted_at IS NULL ORDER BY name_en`;
    return safeQuery(query, args);
  }

  static async query489(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_reporting_lines SET deleted_at = NOW() WHERE line_id = $1 AND deleted_at IS NULL RETURNING line_id`;
    return safeQuery(query, args);
  }

  static async query490(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_reporting_lines (line_id, tenant_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, line_type, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query491(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_reporting_lines WHERE deleted_at IS NULL ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query492(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_bodies SET deleted_at = NOW() WHERE body_id = $1 AND deleted_at IS NULL RETURNING body_id`;
    return safeQuery(query, args);
  }

  static async query493(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_bodies SET
       name_en = COALESCE($2, name_en), name_ar = COALESCE($3, name_ar),
       body_type = COALESCE($4, body_type), domain_id = COALESCE($5, domain_id),
       charter_id = COALESCE($6, charter_id), oversight_model = COALESCE($7, oversight_model),
       sponsor_id = COALESCE($8, sponsor_id), status = COALESCE($9, status), updated_at = NOW()
     WHERE body_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query494(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_bodies (body_id, tenant_id, name_en, name_ar, body_type, domain_id, charter_id, oversight_model, sponsor_id, committee_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query495(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query496(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_domains SET deleted_at = NOW() WHERE domain_id = $1 AND deleted_at IS NULL RETURNING domain_id`;
    return safeQuery(query, args);
  }

  static async query497(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".governance_domains SET
       name_en = COALESCE($2, name_en), name_ar = COALESCE($3, name_ar),
       description = COALESCE($4, description), sponsor_id = COALESCE($5, sponsor_id),
       owner_id = COALESCE($6, owner_id), parent_domain_id = COALESCE($7, parent_domain_id),
       status = COALESCE($8, status), updated_at = NOW()
     WHERE domain_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query498(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_domains (domain_id, tenant_id, name_en, name_ar, description, sponsor_id, owner_id, parent_domain_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query499(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".governance_domains WHERE deleted_at IS NULL ORDER BY name_en`;
    return safeQuery(query, args);
  }

}
