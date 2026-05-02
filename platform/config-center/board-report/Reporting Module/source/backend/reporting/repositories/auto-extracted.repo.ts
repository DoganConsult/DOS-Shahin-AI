// @ts-nocheck
// Auto-extracted Reporting repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class ReportingAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
           COUNT(*) FILTER (WHERE status = 'published')::int AS published,
           COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
           COUNT(*) FILTER (WHERE is_scheduled = true AND status != 'archived')::int AS scheduled,
           COUNT(*) FILTER (
             WHERE status = 'published'
               AND published_at >= NOW() - INTERVAL '30 days'
           )::int AS recently_published,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (generated_at - requested_at)))
               FILTER (WHERE generated_at IS NOT NULL AND requested_at IS NOT NULL),
             NULL
           )::numeric AS avg_gen_time_sec
         FROM "${schema}".reports`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".report_definitions WHERE status = 'stale' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".report_definitions WHERE status = 'failed' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".report_definitions WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'reporting' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'reporting','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT tenant_id FROM tenants WHERE status = 'active' OR status = 'onboarding'`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_packs (pack_id, tenant_id, title_en, title_ar, meeting_date, status, prepared_by, created_at)
       VALUES ($1, $2, $3, $4, $5, 'draft', 'system', NOW()) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT snapshot_date, compliance_score
     FROM "${schema}".kpi_snapshots
     WHERE snapshot_date >= $1 AND snapshot_date <= $2
     ORDER BY snapshot_date ASC`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT id, agent_id as "agentId", discovery_type as type,
            title, severity, entity_type as "entityType", entity_id as "entityId",
            details, created_at as timestamp
     FROM "${schema}".agent_discoveries
     WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
     ORDER BY 
       CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       created_at DESC
     LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT observation_id as id, agent_id as "agentId", observation_type as type,
            title, severity, entity_type as "entityType", entity_id as "entityId",
            description as details, created_at as timestamp
     FROM "${schema}".ai_observations
     WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
     ORDER BY 
       CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       created_at DESC
     LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `SELECT agent_id AS "agentId",
            COUNT(*)::int AS "actionsTaken",
            MAX(created_at) AS "lastRunAt"
     FROM "${'schema'}".agrc_agent_actions
     WHERE created_at >= $1
     GROUP BY agent_id
     ORDER BY agent_id`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT title, due_date AS "dueDate", framework_code AS framework,
            EXTRACT(DAY FROM due_date - CURRENT_DATE)::int AS "daysRemaining"
     FROM "${schema}".tasks
     WHERE due_date IS NOT NULL
       AND due_date >= CURRENT_DATE
       AND status NOT IN ('completed', 'cancelled')
     ORDER BY due_date ASC
     LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `SELECT snapshot_date::text AS date,
            COALESCE((data->>'compliance_rate')::int, 0) AS "complianceRate",
            COALESCE((data->>'risk_score')::int, 0) AS "riskScore",
            COALESCE((data->>'open_findings')::int, 0) AS "openFindings",
            COALESCE((data->>'evidence_freshness')::int, 0) AS "evidenceFreshness"
     FROM "${schema}".dashboard_snapshots
     WHERE snapshot_date >= CURRENT_DATE - ($1 || ' days')::interval
     ORDER BY snapshot_date`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT severity, title, description, framework_code AS "affectedFramework"
     FROM "${schema}".findings
     WHERE status = 'open' AND created_at >= $1
     ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
     LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT risk_name AS "riskName",
            COALESCE(risk_category, 'general') AS category,
            CASE impact WHEN 'critical' THEN 5 WHEN 'high' THEN 4 WHEN 'medium' THEN 3 WHEN 'low' THEN 2 ELSE 1 END AS impact,
            CASE likelihood WHEN 'almost_certain' THEN 5 WHEN 'likely' THEN 4 WHEN 'possible' THEN 3 WHEN 'unlikely' THEN 2 ELSE 1 END AS likelihood,
            COALESCE(risk_score, 0) AS score
     FROM "${schema}".risks
     WHERE status IN ('open', 'mitigating', 'active')
     ORDER BY risk_score DESC NULLS LAST
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT c.framework_code AS code,
            COALESCE(f.framework_name, c.framework_code) AS name,
            COUNT(*)::int AS "totalControls",
            COUNT(*) FILTER (WHERE c.compliance_status = 'compliant')::int AS "compliantControls",
            COUNT(*) FILTER (WHERE c.criticality = 'critical' AND c.compliance_status <> 'compliant')::int AS "criticalGaps"
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".frameworks f ON f.framework_code = c.framework_code
     WHERE c.status = 'active' AND c.framework_code IS NOT NULL
     GROUP BY c.framework_code, f.framework_name
     ORDER BY c.framework_code`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT report_id, report_type, title, data, generated_at, generated_by, metadata
     FROM "${schema}".reports
     WHERE generated_by = $1 AND metadata->>'naturalLanguage' = 'true'
     ORDER BY generated_at DESC
     LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".reports (report_id, report_type, title, data, generated_at, generated_by, metadata)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6)`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS failing FROM "${schema}".controls WHERE test_status = 'failed'`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS overdue FROM "${schema}".process_tasks
     WHERE due_at < NOW() AND status IN ('open', 'in_progress')`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS stale FROM "${schema}".evidence_tasks
     WHERE last_collected_at < NOW() - INTERVAL '30 days' OR last_collected_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT t.team_id, t.name,
            (SELECT COUNT(*) FROM "${schema}".process_tasks pt WHERE pt.assigned_team = t.team_id AND pt.status IN ('open', 'in_progress'))::int AS open_tasks,
            (SELECT COUNT(*) FROM "${schema}".process_tasks pt WHERE pt.assigned_team = t.team_id AND pt.due_at < NOW() AND pt.status != 'done')::int AS overdue,
            (SELECT COUNT(*) FROM "${schema}".team_members tm WHERE tm.team_id = t.team_id AND tm.is_active = true)::int AS members
     FROM "${schema}".teams t
     WHERE t.is_active = true
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title FROM "${schema}".controls
     WHERE (test_status = 'failed' OR status != 'compliant' OR updated_at < NOW() - INTERVAL '60 days')
     LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS gaps_this_month
       FROM "${schema}".agrc_event_log
       WHERE event_type ILIKE '%gap%' AND created_at > NOW() - INTERVAL '30 days'`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'valid')::int AS valid,
        COUNT(*) FILTER (WHERE last_collected_at < NOW() - INTERVAL '30 days' OR last_collected_at IS NULL)::int AS stale
       FROM "${schema}".evidence_tasks`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant,
        COUNT(*) FILTER (WHERE test_status = 'failed')::int AS failing_tests,
        COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '60 days')::int AS stale
       FROM "${schema}".controls`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT r.risk_id, r.title, r.severity, r.status, r.likelihood, r.impact,
            r.created_at, r.updated_at,
            (SELECT COUNT(*) FROM "${schema}".process_tasks pt WHERE pt.entity_id = r.risk_id AND pt.status = 'open')::int AS open_tasks,
            (SELECT COUNT(*) FROM "${schema}".process_tasks pt WHERE pt.entity_id = r.risk_id AND pt.due_at < NOW())::int AS overdue_tasks,
            (SELECT COUNT(*) FROM "${schema}".controls c WHERE c.risk_id = r.risk_id AND c.status != 'compliant')::int AS failing_controls
     FROM "${schema}".risks r
     WHERE r.status NOT IN ('closed', 'archived')
     ORDER BY CASE r.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FROM "${schema}".findings WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FROM "${schema}".evidence WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FROM "${schema}".tenant_controls WHERE framework_id = $1 AND domain = $2`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT domain) FROM "${schema}".controls WHERE framework_id = $1`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FROM "${schema}".frameworks WHERE active = true`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT framework_id, name_en, name_ar FROM "${schema}".frameworks WHERE active = true`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT control_id, test_result, evidence_count, notes
         FROM "${schema}".assessment_results
         WHERE assessment_id = $1`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".assessments WHERE assessment_id = $1`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_tasks WHERE finding_id = $1 ORDER BY due_date`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".findings WHERE finding_id = $1`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title_en, title_ar
         FROM "${schema}".tenant_controls
         WHERE control_id IN (
           SELECT control_id FROM "${schema}".risk_control_map WHERE risk_id = $1
         )`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_tasks WHERE risk_id = $1 ORDER BY due_date`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risks WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title_en, title_ar
         FROM "${schema}".tenant_controls
         WHERE control_id IN (
           SELECT control_id FROM "${schema}".evidence_control_map WHERE evidence_id = $1
         )`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT version, collected_at, collected_by, hash
         FROM "${schema}".evidence_versions
         WHERE evidence_id = $1
         ORDER BY version DESC`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT finding_id, title, severity, status, due_date
         FROM "${schema}".findings
         WHERE control_id = $1
         ORDER BY created_at DESC
         LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, collected_at, status, quality_tier
         FROM "${schema}".evidence
         WHERE control_id = $1
         ORDER BY collected_at DESC
         LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".tenant_controls WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title_en, title_ar, status, score, family
         FROM "${schema}".tenant_controls
         WHERE framework_id = $1 AND domain = $2
         ORDER BY family, control_id`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title_en, title_ar, status, score
         FROM "${schema}".tenant_controls
         WHERE framework_id = $1
         LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT domain FROM "${schema}".controls WHERE framework_id = $1`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".frameworks WHERE framework_id = $1`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT 
          COUNT(*) FILTER (WHERE status = 'compliant') as compliant,
          COUNT(*) FILTER (WHERE status = 'partially_compliant') as partially_compliant,
          COUNT(*) FILTER (WHERE status = 'non_compliant') as non_compliant,
          COUNT(*) FILTER (WHERE status = 'not_assessed') as not_assessed
         FROM "${schema}".tenant_controls`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT framework_id, name_en, name_ar FROM "${schema}".frameworks WHERE active = true`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, name, contract_expiry, risk_tier, assessment_score
     FROM "${schema}".vendors
     WHERE contract_expiry <= NOW() + INTERVAL '90 days'
       AND status = 'active'
     ORDER BY contract_expiry`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT risk_tier, COUNT(*)::int AS count,
            AVG(assessment_score)::decimal AS avg_score
     FROM "${schema}".vendors
     WHERE status = 'active'
     GROUP BY risk_tier
     ORDER BY risk_tier`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".findings WHERE status = 'open'`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT control_id)::int AS count FROM "${schema}".evidence`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".controls`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT test_status, COUNT(*)::int AS count
     FROM "${schema}".controls
     GROUP BY test_status`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT ai.control_node_id AS domain_code,
            COUNT(*)::int AS total_items,
            COUNT(*) FILTER (WHERE ai.status = 'compliant')::int AS compliant,
            COUNT(*) FILTER (WHERE ai.status = 'partially_compliant')::int AS partial,
            COUNT(*) FILTER (WHERE ai.status = 'non_compliant')::int AS non_compliant
     FROM "${schema}".assessment_items ai
     JOIN "${schema}".assessments a ON a.assessment_id = ai.assessment_id
     WHERE a.framework_id = $1
     GROUP BY ai.control_node_id
     ORDER BY ai.control_node_id`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT framework_id, name, completion_percent
     FROM "${schema}".frameworks ORDER BY name`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title, risk_score, status
     FROM "${schema}".risks
     WHERE status != 'closed'
     ORDER BY risk_score DESC LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `SELECT AVG(score)::decimal AS avg_score FROM "${schema}".assessments`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = evidenceQuery;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = domainQuery;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `SELECT category,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'identified')::int AS identified,
            COUNT(*) FILTER (WHERE status = 'mitigated')::int AS mitigated,
            COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
            AVG(risk_score)::decimal AS avg_score
     FROM "${schema}".risks
     GROUP BY category
     ORDER BY avg_score DESC`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `SELECT a.framework_id, a.title, a.score, a.status,
            COUNT(ai.item_id)::int AS total_items,
            COUNT(*) FILTER (WHERE ai.status = 'compliant')::int AS compliant,
            COUNT(*) FILTER (WHERE ai.status = 'non_compliant')::int AS non_compliant,
            COUNT(*) FILTER (WHERE ai.status = 'not_assessed')::int AS not_assessed
     FROM "${schema}".assessments a
     LEFT JOIN "${schema}".assessment_items ai ON ai.assessment_id = a.assessment_id
     WHERE 1=1 ${whereClause}
     GROUP BY a.assessment_id, a.framework_id, a.title, a.score, a.status
     ORDER BY a.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `SELECT compliance_score FROM "${schema}".kpi_snapshots
       ORDER BY snapshot_date DESC LIMIT 2`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `SELECT framework_id, name, completion_percent
     FROM "${schema}".frameworks
     ORDER BY name`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title, risk_score, status
     FROM "${schema}".risks
     WHERE status != 'closed'
     ORDER BY risk_score DESC
     LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `SELECT AVG(score)::decimal AS avg_score FROM "${schema}".assessments`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = evidenceQuery;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = domainQuery;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".report_schedules
       (report_type, parameters, cron_expression, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING schedule_id, created_at`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".reports (title, type, parameters, generated_by)
     VALUES ($1, $2, $3, $4)
     RETURNING report_id`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".report_schedules (report_type, parameters, cron_expression, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".reports (title, type, parameters, generated_by, generated_at)
     VALUES ($1, $2, $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".kpi_snapshots ORDER BY snapshot_date DESC LIMIT 52`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, status, mapped_registry_nodes FROM "${schema}".controls WHERE $1 = ANY(frameworks)`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `SELECT report_id, title, type, parameters, generated_by, generated_at
     FROM "${schema}".reports
     WHERE report_id = $1`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `SELECT report_id, title, type, parameters, generated_by, generated_at
     FROM "${schema}".reports
     WHERE report_id = $1`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `SELECT report_id, title, type, parameters, generated_by, generated_at
     FROM "${schema}".reports
     WHERE report_id = $1`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = dataSql;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = countSql;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".reports`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".reports (title, type, parameters, generated_by, generated_at)
           VALUES ($1, $2, '{}', $3, NOW())`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".report_shares WHERE share_id = $1`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT report_id
     FROM "${schema}".report_shares
     WHERE recipient_id = $1`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `SELECT share_id, report_id, shared_by, recipient_id, recipient_type, shared_at
     FROM "${schema}".report_shares
     WHERE report_id = $1
     ORDER BY shared_at DESC`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `SELECT email, full_name FROM users WHERE user_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `SELECT title FROM "${schema}".reports WHERE report_id = $1`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".report_shares
         (report_id, shared_by, recipient_id, recipient_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (report_id, recipient_id) DO UPDATE SET
         shared_by = EXCLUDED.shared_by, recipient_type = EXCLUDED.recipient_type
       WHERE (report_shares.shared_by, report_shares.recipient_type) IS DISTINCT FROM (EXCLUDED.shared_by, EXCLUDED.recipient_type)
       RETURNING share_id, report_id, shared_by, recipient_id, recipient_type, shared_at`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `SELECT data FROM "${schema}".reports WHERE report_type = $1 ORDER BY generated_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `SELECT schedule_id, report_type, parameters, cron_expression,
            enabled, last_run_at, created_by, created_at
     FROM "${schema}".report_schedules
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".report_schedules
       (report_type, parameters, cron_expression, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING schedule_id, report_type, parameters, cron_expression,
               enabled, last_run_at, created_by, created_at`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT control_id)::int as count
       FROM "${schema}".evidence`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int as total FROM "${schema}".controls`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int as count
       FROM "${schema}".remediation_tasks
       WHERE status IN ('open', 'in_progress')`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int as count
     FROM "${schema}".risks
     WHERE status != 'closed'`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `SELECT AVG(score)::decimal as avg_score
     FROM "${schema}".assessments`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT e.evidence_id)::int as count
       FROM "${schema}".evidence e
       INNER JOIN "${schema}".assessment_items ai
         ON e.control_id = ai.control_node_id
       WHERE ai.assessment_id = ANY($1)`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int as count
       FROM "${schema}".assessment_items
       WHERE assessment_id = ANY($1)
       GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `SELECT assessment_id, title, score, status
     FROM "${schema}".assessments
     WHERE framework_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".${table}
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 10000`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric(10,1) AS avg_hours
         FROM "${schema}".incidents
         WHERE resolved_at IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(CASE WHEN implementation_status = 'implemented' THEN 1 END)::float
                / NULLIF(COUNT(*), 0) * 100 AS pct
         FROM "${schema}".controls
         WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = `SELECT AVG(residual_risk_score)::numeric(5,2) AS avg_score
         FROM "${schema}".risks
         WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `SELECT indicator_name, current_value, threshold_amber, threshold_red, status
           FROM "${schema}".key_risk_indicators
           WHERE status IN ('amber', 'red')`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `SELECT severity, COUNT(*)::int AS count
           FROM "${schema}".incidents
           WHERE status != 'closed'
           GROUP BY severity`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `SELECT severity, COUNT(*)::int AS count
           FROM "${schema}".findings
           WHERE status != 'closed'
           GROUP BY severity`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `SELECT framework_name, compliance_pct
           FROM "${schema}".compliance_snapshots
           ORDER BY snapshot_date DESC
           LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS count
           FROM "${schema}".risks
           WHERE deleted_at IS NULL
           GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".report_packages WHERE package_id = $1`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".report_packages ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".report_packages
       (title, description, sections, period, prepared_by, status)
     VALUES ($1, $2, $3::jsonb, $4, $5, 'draft')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".${table} WHERE ${col} = $1`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".${table}
       WHERE ${col} = $1
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".report_schedules
     SET active = false
     WHERE schedule_id = $1
     RETURNING schedule_id`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".report_schedules
     SET ${fields.join(", ")}
     WHERE schedule_id = $${idx}
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".report_schedules
     WHERE active = true
     ORDER BY next_run_at ASC`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".report_schedules
       (report_template_id, title, frequency, recipients, next_run_at, format, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz, $6, $7)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".saved_queries ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".saved_queries (name, query_definition, created_by)
     VALUES ($1, $2::jsonb, $3) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".generated_reports ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".generated_reports ${where}`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".generated_reports WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".generated_reports WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".generated_reports WHERE id = $1`;
    return safeQuery(query, args);
  }

}
