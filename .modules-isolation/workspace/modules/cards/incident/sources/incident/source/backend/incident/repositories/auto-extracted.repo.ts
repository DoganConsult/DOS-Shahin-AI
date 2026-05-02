// @ts-nocheck
// Auto-extracted Incident repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class IncidentAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT
         d.date::date::text AS date,
         COUNT(i.incident_id) FILTER (WHERE i.created_at::date = d.date::date)::int AS new_incidents,
         COUNT(i.incident_id) FILTER (
           WHERE i.status IN ('resolved', 'closed')
             AND i.updated_at::date = d.date::date
         )::int AS resolved_incidents
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       LEFT JOIN "${schema}".incidents i
         ON (i.created_at::date = d.date::date
             OR (i.status IN ('resolved', 'closed') AND i.updated_at::date = d.date::date))
       GROUP BY d.date
       ORDER BY d.date ASC`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) FILTER (WHERE status IN ('open', 'investigating', 'contained'))::int AS open_incidents,
         COUNT(*) FILTER (WHERE sla_breached = true AND status NOT IN ('resolved', 'closed'))::int AS sla_breaches
       FROM "${schema}".incidents`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open,
         COUNT(*) FILTER (WHERE status = 'investigating')::int AS investigating,
         COUNT(*) FILTER (WHERE status = 'contained')::int AS contained,
         COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
         COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
         COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
         COUNT(*) FILTER (WHERE severity = 'low')::int AS low,
         COUNT(*) FILTER (WHERE sla_breached = true)::int AS sla_breaches
       FROM "${schema}".incidents`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".incidents WHERE status = 'escalated' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".incidents WHERE status = 'open' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".incidents WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'incident' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'incident','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT l.*, r.title AS risk_title, r.risk_score
     FROM "${schema}".incident_risk_links l
     LEFT JOIN "${schema}".risks r ON r.risk_id = l.risk_id
     WHERE l.incident_id = $1 AND l.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_risk_links (incident_id, risk_id, link_type, impact_on_risk, linked_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING *`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".incident_recurring_patterns WHERE is_active = TRUE ORDER BY occurrence_count DESC LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".incident_trend_cache
     WHERE granularity = $1 ORDER BY period_start DESC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incident_regulatory_notifications
     SET status = 'submitted', submitted_at = NOW(), submitted_by = $1, reference_number = $2, updated_at = NOW()
     WHERE notification_id = $3 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `SELECT n.*, i.title AS incident_title, i.severity AS incident_severity
     FROM "${schema}".incident_regulatory_notifications n
     JOIN "${schema}".incidents i ON i.incident_id = n.incident_id
     WHERE n.deleted_at IS NULL ORDER BY n.deadline ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_regulatory_notifications
       (incident_id, regulation_code, regulation_name, authority_name, sla_hours, deadline, content_summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incident_pir SET ${fields.join(',')} WHERE pir_id = $${idx} RETURNING *`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_pir (incident_id, title, pir_type, lead_id, scheduled_date)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".near_miss_reports
       (title, description, reported_by, taxonomy_node_id, severity_estimate, location, department_id, potential_impact)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incident_taxonomy SET ${fields.join(',')} WHERE node_id = $${idx} RETURNING *`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_taxonomy
       (code, name_en, name_ar, parent_id, node_type, severity_hint, regulatory_flag)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT category, COUNT(*) AS cnt FROM "${schema}".incidents WHERE reported_at > NOW() - INTERVAL '${interval}' GROUP BY category ORDER BY cnt DESC LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT severity, COUNT(*) AS cnt FROM "${schema}".incidents WHERE reported_at > NOW() - INTERVAL '${interval}' GROUP BY severity ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='closed') AS closed FROM "${schema}".incidents WHERE reported_at > NOW() - INTERVAL '${interval}'`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - reported_at))/3600),1) AS avg_hours FROM "${schema}".incidents WHERE resolved_at IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT category, COUNT(*) AS cnt FROM "${schema}".incidents WHERE reported_at > NOW() - INTERVAL '90 days' GROUP BY category HAVING COUNT(*) > 3 ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".incidents WHERE severity='critical' AND status='open'`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT severity, status, category, impact FROM "${schema}".incidents WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT severity, status, impact, reported_at, resolved_at FROM "${schema}".incidents WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `SELECT category, severity FROM "${schema}".incidents WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT title, description, severity, status, category, reported_by, reported_at, resolved_at, impact
     FROM "${schema}".incidents WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".breach_reporting_records
     WHERE reporting_deadline < NOW()
       AND status NOT IN ('submitted', 'acknowledged', 'closed')
       AND deleted_at IS NULL
     ORDER BY reporting_deadline ASC`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".breach_reporting_records
     SET status = 'acknowledged', updated_at = NOW()
     WHERE record_id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".breach_reporting_records
     SET status = 'submitted', reported_at = NOW(), submitted_by = $2, updated_at = NOW()
     WHERE record_id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".breach_reporting_records
     SET ${fields.join(', ')}
     WHERE record_id = $${idx}
       AND status IN ('draft', 'pending_review')
       AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT br.*, i.title AS incident_title
     FROM "${schema}".breach_reporting_records br
     JOIN "${schema}".incidents i ON i.incident_id = br.incident_id
     WHERE br.record_id = $1 AND br.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".breach_reporting_records
       (incident_id, breach_type, reporting_authority,
        affected_individuals_count, data_categories_affected, cross_border,
        reporting_deadline, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + ($7 || ' hours')::INTERVAL, $8)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT cn.note_id AS entry_id,
            'note' AS entry_type,
            cn.content,
            cn.author_id,
            cn.created_at AS timestamp
     FROM "${schema}".case_notes cn
     WHERE cn.case_id = $1 AND cn.deleted_at IS NULL

     UNION ALL

     SELECT iu.update_id AS entry_id,
            'incident_update' AS entry_type,
            iu.content,
            iu.author_id,
            iu.created_at AS timestamp
     FROM "${schema}".incident_updates iu
     JOIN "${schema}".case_incidents ci ON ci.incident_id = iu.incident_id
     WHERE ci.case_id = $1

     ORDER BY timestamp DESC`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".case_notes
     WHERE case_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".case_notes (case_id, author_id, content, note_type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT i.*
     FROM "${schema}".incidents i
     JOIN "${schema}".case_incidents ci ON ci.incident_id = i.incident_id
     WHERE ci.case_id = $1 AND i.deleted_at IS NULL
     ORDER BY i.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".case_incidents WHERE case_id = $1 AND incident_id = $2`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".case_incidents (case_id, incident_id, linked_by)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".cases
     SET status = $2, updated_at = NOW()${closedClause}
     WHERE case_id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".cases SET ${fields.join(', ')} WHERE case_id = $${idx} AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT c.*,
       (SELECT COUNT(*) FROM "${schema}".case_incidents ci WHERE ci.case_id = c.case_id) AS incident_count
     FROM "${schema}".cases c
     WHERE c.case_id = $1 AND c.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".cases
       (title, description, case_type, priority, severity,
        assigned_to, lead_investigator, department_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `
            INSERT INTO "${schema}".notifications (user_id, type, title, body, link, read, created_at)
            SELECT $1, 'incident_sla_breach', $2, $3, $4, FALSE, NOW()
            WHERE NOT EXISTS (
              SELECT 1 FROM "${schema}".notifications n
              WHERE n.user_id = $1 AND n.type = 'incident_sla_breach' AND n.link = $4
                AND n.created_at > NOW() - INTERVAL '4 hours'
            )
          `;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `
          UPDATE "${schema}".incidents
          SET escalation_state = 'escalated',
              board_attention = CASE WHEN $2::boolean THEN TRUE ELSE COALESCE(board_attention, FALSE) END,
              updated_at = NOW()
          WHERE incident_id = $1
        `;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `
      SELECT i.*,
        EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 3600 AS hours_elapsed
      FROM "${schema}".incidents i
      WHERE i.deleted_at IS NULL
        AND i.status NOT IN ('resolved', 'closed')
        AND (
          (i.severity = 'critical' AND i.created_at < NOW() - INTERVAL '${c} hours')
          OR (i.severity = 'high' AND i.created_at < NOW() - INTERVAL '${h} hours')
          OR (i.severity = 'medium' AND i.created_at < NOW() - INTERVAL '${m} hours')
          OR (i.severity = 'low' AND i.created_at < NOW() - INTERVAL '${l} hours')
        )
    `;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT impact_type,
            COUNT(*)            AS impact_count,
            SUM(estimated_cost) AS total_cost
     FROM "${schema}".incident_impacts
     WHERE deleted_at IS NULL
     GROUP BY impact_type
     ORDER BY total_cost DESC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT
       SUM(estimated_cost)              AS total_cost,
       COUNT(*)                         AS impact_count,
       MAX(CASE severity
         WHEN 'critical' THEN 4
         WHEN 'high'     THEN 3
         WHEN 'medium'   THEN 2
         WHEN 'low'      THEN 1
         ELSE 0
       END)                             AS max_severity_rank,
       CASE MAX(CASE severity
         WHEN 'critical' THEN 4 WHEN 'high' THEN 3
         WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0
       END)
         WHEN 4 THEN 'critical'
         WHEN 3 THEN 'high'
         WHEN 2 THEN 'medium'
         WHEN 1 THEN 'low'
         ELSE 'none'
       END                              AS max_severity,
       ARRAY_AGG(DISTINCT impact_type)  AS impact_types
     FROM "${schema}".incident_impacts
     WHERE incident_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incident_impacts SET deleted_at = NOW() WHERE impact_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incident_impacts SET ${fields.join(', ')} WHERE impact_id = $${idx} AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".incident_impacts
     WHERE incident_id = $1 AND deleted_at IS NULL
     ORDER BY assessed_at DESC`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_impacts
       (incident_id, impact_type, severity, description, estimated_cost,
        affected_systems, affected_users_count, duration_hours, mitigation_applied, assessed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".incident_policies
     WHERE incident_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".incident_policies
     WHERE incident_id = $1 AND policy_id = $2`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_policies (incident_id, policy_id, linked_by)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".incident_evidence
     WHERE incident_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".incident_evidence
     WHERE incident_id = $1 AND evidence_id = $2`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_evidence (incident_id, evidence_id, linked_by)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".incident_vendors
     WHERE incident_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".incident_vendors
     WHERE incident_id = $1 AND vendor_id = $2`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_vendors (incident_id, vendor_id, vendor_role, linked_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".incident_assets
     WHERE incident_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".incident_assets
     WHERE incident_id = $1 AND asset_id = $2`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_assets (incident_id, asset_id, linked_by)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `SELECT nl.*, i.title AS incident_title
     FROM "${schema}".incident_notifications_log nl
     LEFT JOIN "${schema}".incidents i ON i.incident_id = nl.incident_id
     WHERE nl.recipient_id = $1 AND nl.acknowledged_at IS NULL
     ORDER BY nl.sent_at DESC`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incident_notifications_log
     SET acknowledged_at = NOW()
     WHERE notification_id = $1 AND recipient_id = $2
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `SELECT nl.*, i.title AS incident_title
     FROM "${schema}".incident_notifications_log nl
     LEFT JOIN "${schema}".incidents i ON i.incident_id = nl.incident_id
     ${where}
     ORDER BY nl.sent_at DESC`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_notifications_log
       (incident_id, notification_type, recipient_id, channel, content_summary)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `SELECT config_value FROM "${schema}".platform_operation_config WHERE config_key = $1 AND owner_module = 'incident' LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".incident_triage_decisions
     WHERE incident_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `SELECT severity_hint FROM "${schema}".incident_taxonomy WHERE node_id = $1`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".incidents WHERE incident_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incidents
     SET severity   = $2,
         status     = 'investigating',
         assigned_to = COALESCE($3, assigned_to),
         updated_at  = NOW()
     WHERE incident_id = $1`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incident_triage_decisions
       (incident_id, triage_officer, severity_assessed, priority_assigned,
        category_assigned, assignment_decision, rationale, auto_scored, sla_clock_started_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `SELECT i.*
     FROM "${schema}".incidents i
     LEFT JOIN "${schema}".incident_triage_decisions td
       ON td.incident_id = i.incident_id
     WHERE i.status = 'reported'
       AND i.deleted_at IS NULL
       AND td.decision_id IS NULL
     ORDER BY i.created_at ASC`;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".war_rooms WHERE war_room_id = $1`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".war_rooms ${where} ORDER BY created_at DESC LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".war_rooms WHERE war_room_id = $1`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".war_rooms SET status = 'resolved', resolved_at = NOW() WHERE war_room_id = $1`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".war_rooms SET timeline = $1 WHERE war_room_id = $2`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".war_rooms SET containment_steps = $1, timeline = $2 WHERE war_room_id = $3`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".war_rooms SET raci_assignments = $1, timeline = $2 WHERE war_room_id = $3`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".war_rooms
       (war_room_id, incident_id, raci_assignments, timeline, containment_steps, title, severity, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING war_room_id, created_at`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incidents SET status = $1 WHERE incident_id = $2 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incidents SET status = $1, resolved_at = NOW()
       WHERE incident_id = $2 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incidents SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      severity = COALESCE($4, severity),
      affected_controls = COALESCE($5, affected_controls),
      assigned_to = COALESCE($6, assigned_to),
      updated_at = NOW()
     WHERE incident_id = $7
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incidents SET
      lessons_learned = $1,
      status = 'closed',
      resolved_at = NOW()
     WHERE incident_id = $2
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incidents SET
      assigned_to = $1,
      root_cause = COALESCE($2, root_cause),
      status = COALESCE($3, 'investigating')
     WHERE incident_id = $4
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".incidents WHERE incident_id = $1`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM public.users WHERE role IN ('admin', 'super_admin') AND tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".incidents
      (title, description, category, severity, affected_controls, reported_by, status, owner_user_id, org_unit_id)
     VALUES ($1,$2,$3,$4,$5,$6,'reported',$6,$7)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".capa_records SET status = $1, updated_at = NOW() WHERE capa_id = $2`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".capa_records`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `SELECT AVG(EXTRACT(EPOCH FROM (completed_date::timestamp - created_at::timestamp)) / 86400) AS avg_days
     FROM "${schema}".capa_records
     WHERE status = 'closed' AND completed_date IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".capa_records
     WHERE due_date < CURRENT_DATE AND status NOT IN ('closed', 'verification')`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `SELECT priority, COUNT(*) AS cnt FROM "${schema}".capa_records GROUP BY priority`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `SELECT capa_type, COUNT(*) AS cnt FROM "${schema}".capa_records GROUP BY capa_type`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) AS cnt FROM "${schema}".capa_records GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".capa_records
     WHERE due_date < CURRENT_DATE
       AND status NOT IN ('closed', 'verification')
     ORDER BY due_date ASC`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".capa_records
     SET effectiveness_review = $1, effectiveness_rating = $2,
         effectiveness_reviewed_by = $3, effectiveness_reviewed_at = NOW(),
         evidence_ids = $4, updated_at = NOW()
     WHERE capa_id = $5`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".capa_records WHERE capa_id = $1`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".capa_records
     SET status = $1${completedDateClause}, updated_at = NOW()
     WHERE capa_id = $2`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".capa_records WHERE capa_id = $1`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".capa_records ${where}
     ORDER BY
       CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       due_date ASC NULLS LAST
     LIMIT $${idx++} OFFSET $${idx++}`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FROM "${schema}".capa_records ${where}`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".capa_status_log
       WHERE capa_id = $1 ORDER BY changed_at ASC`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".capa_records WHERE capa_id = $1`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".capa_records SET ${fields.join(', ')} WHERE capa_id = $${idx}`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".capa_records
     (capa_id, capa_type, title_en, title_ar, description,
      source_type, source_id,
      root_cause_analysis, corrective_action, preventive_action,
      status, priority, assigned_to, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".capa_status_log
     (log_id, capa_id, from_status, to_status, changed_by, reason, changed_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".issue_verifications ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".issue_verifications
       WHERE issue_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".issue_verifications
       (issue_id, verified_by, verification_date, effective, evidence, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".issues
         SET ${setClauses.join(", ")}
         WHERE issue_id = $${paramIdx}`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".issue_relationships
     WHERE source_issue_id = $1 OR target_issue_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".issue_relationships
       (source_issue_id, target_issue_id, relation_type, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".issue_root_cause_analyses
     WHERE issue_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".issue_root_cause_analyses
       (issue_id, rca_type, analysis_data, root_causes, corrective_actions, analyst, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = `SELECT issue_id, title, priority, assignee, status,
            EXTRACT(DAY FROM (now() - created_at))::INT AS age_days
     FROM "${schema}".issues
     WHERE status NOT IN ('closed', 'resolved', 'cancelled')
     ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".issue_escalation_rules WHERE active = true ORDER BY days_threshold ASC`;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".issue_escalation_rules
       (priority, days_threshold, escalate_to_role, notification_template, active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".issue_escalation_rules ORDER BY priority, days_threshold`;
    return safeQuery(query, args);
  }

}
