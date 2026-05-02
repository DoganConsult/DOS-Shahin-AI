// @ts-nocheck
// Auto-extracted KsaRegulatory repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class KsaRegulatoryAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT framework_code FROM "${s}".frameworks WHERE is_active = true`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT framework_code)::int AS enabled FROM "${schema}".frameworks WHERE status IN ('active','enabled') OR status IS NULL`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".ksa_regulatory_readiness_snapshots WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".control_mappings WHERE (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
         COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue
       FROM "${schema}".obligations WHERE (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented','effective'))::int AS implemented
       FROM "${schema}".controls WHERE (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".tenant_preferences (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT key, value FROM "${schema}".tenant_preferences WHERE key LIKE 'ksa_regulatory.%'`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT MAX(snapshot_at) AS last_snap FROM "${schema}".ksa_regulatory_readiness_snapshots WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(DISTINCT c.control_id)::int AS total,
           COUNT(DISTINCT c.control_id) FILTER (WHERE e.evidence_id IS NOT NULL)::int AS with_evidence
         FROM "${schema}".controls c
         LEFT JOIN "${schema}".evidence_evidences e
           ON e.entity_type = 'control' AND e.entity_id = c.control_id::text
           AND e.status IN ('accepted','submitted') AND (e.deleted_at IS NULL OR e.deleted_at > NOW())
         WHERE (c.deleted_at IS NULL OR c.deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue
         FROM "${schema}".obligations WHERE (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT framework_code)::int AS count FROM "${schema}".frameworks WHERE status IN ('active','enabled') OR status IS NULL`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".compliance_scores
           (score_date, score_type, framework_code, overall_score,
            design_score, implementation_score, operational_score,
            controls_tested, controls_passed, controls_failed, controls_not_applicable)
         VALUES (CURRENT_DATE, 'framework', $1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".compliance_scores
         (score_date, score_type, overall_score, design_score, implementation_score, operational_score)
       VALUES (CURRENT_DATE, 'overall', $1, $2, $3, $4)
       ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = gapSql;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = fwNameSql;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = testSql;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = evidenceSql;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = statusSql;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, description, framework_id
     FROM "${schema}".controls
     WHERE framework_id <> $1 AND deleted_at IS NULL
     ORDER BY framework_id, control_id
     LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, description, framework_id
     FROM "${schema}".controls
     WHERE control_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".cross_framework_mappings
           (tenant_id, source_framework, source_control_id, source_control_code,
            source_control_title, target_framework, target_control_id, target_control_code,
            target_control_title, mapping_strength, mapping_rationale,
            common_domain, common_themes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT DO NOTHING
         RETURNING mapping_id`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, description, framework_id
     FROM "${schema}".controls
     WHERE framework_id = $1 AND deleted_at IS NULL
     ORDER BY control_id
     LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, description, framework_id
     FROM "${schema}".controls
     WHERE framework_id = $1 AND deleted_at IS NULL
     ORDER BY control_id
     LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT rc.id, rc.control_code, rc.control_title_en, rc.control_description_en,
            rf.framework_code
     FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     JOIN public.regulatory_frameworks rf ON rf.framework_code = cd.framework_code
     WHERE rf.is_active = true
     ORDER BY rf.framework_code, rc.control_code
     LIMIT 500`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt
     FROM "${schema}".controls
     WHERE framework_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT
         source_framework, source_control_id, source_control_code, source_control_title,
         target_framework, target_control_id, target_control_code, target_control_title,
         mapping_strength
       FROM "${schema}".cross_framework_mappings
       WHERE source_control_id = $1 OR target_control_id = $1`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT
         mapping_id, source_framework, source_control_id, source_control_code,
         source_control_title, target_framework, target_control_id,
         target_control_code, target_control_title, mapping_strength,
         mapping_rationale, common_domain, common_themes
       FROM "${schema}".cross_framework_mappings
       WHERE (source_framework = $1 AND target_framework = $2)
          OR (source_framework = $2 AND target_framework = $1)
       ORDER BY mapping_strength`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT control_id)::int AS total
       FROM "${schema}".controls
       WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT
         mapping_id, source_framework, source_control_id, source_control_code,
         source_control_title, target_framework, target_control_id,
         target_control_code, target_control_title, mapping_strength,
         mapping_rationale, common_domain, common_themes
       FROM "${schema}".cross_framework_mappings
       ORDER BY source_framework, source_control_code`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS orphan_count
     FROM "${schema}".obligations o
     WHERE o.framework_code NOT IN (
       SELECT DISTINCT c.framework_code FROM "${schema}".controls c WHERE (c.deleted_at IS NULL OR c.deleted_at > NOW())
     ) AND (o.deleted_at IS NULL OR o.deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT framework_code)::int AS enabled_count FROM "${schema}".frameworks WHERE status IN ('active', 'enabled') OR status IS NULL`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue,
       COUNT(*) FILTER (WHERE owner_id IS NULL)::int AS unowned,
       COUNT(*) FILTER (WHERE due_date IS NULL AND status = 'open')::int AS no_deadline
     FROM "${schema}".obligations
     WHERE (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT framework_code)::int AS fw_count FROM "${schema}".controls WHERE (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT MAX(snapshot_at) AS last_snapshot FROM "${schema}".ksa_regulatory_readiness_snapshots WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(DISTINCT c.control_id)::int AS total_controls,
       COUNT(DISTINCT c.control_id) FILTER (WHERE e.evidence_id IS NOT NULL)::int AS controls_with_evidence,
       COUNT(DISTINCT c.control_id) FILTER (WHERE c.implementation_status IN ('implemented','effective') AND e.evidence_id IS NULL)::int AS implemented_without_evidence
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".evidence_evidences e
       ON e.entity_type = 'control' AND e.entity_id = c.control_id::text
       AND e.status IN ('accepted', 'submitted') AND (e.deleted_at IS NULL OR e.deleted_at > NOW())
     WHERE (c.deleted_at IS NULL OR c.deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total_mappings,
       COUNT(*) FILTER (WHERE mapping_strength = 'exact')::int AS exact_count,
       COUNT(*) FILTER (WHERE mapping_strength IS NULL)::int AS unmapped_count
     FROM "${schema}".control_mappings
     WHERE (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".obligations
       SET status = 'overdue', updated_at = NOW()
       WHERE status IN ('open', 'in_progress')
         AND due_date < NOW()
         AND (deleted_at IS NULL OR deleted_at > NOW())
       RETURNING obligation_id`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_count,
       COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant_count,
       COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_count,
       COUNT(*) FILTER (WHERE status = 'waived')::int AS waived_count,
       COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_count,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_count,
       COUNT(*) FILTER (WHERE severity = 'high')::int AS high_count,
       COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium_count,
       COUNT(*) FILTER (WHERE severity = 'low')::int AS low_count
     FROM "${schema}".obligations
     WHERE ${where}`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".obligations
     SET status = $1, updated_at = NOW()
     WHERE obligation_id = $2 AND (deleted_at IS NULL OR deleted_at > NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT o.*,
       (SELECT COUNT(*) FROM "${schema}".compliance_control_mappings ccm WHERE ccm.obligation_id = o.obligation_id AND (ccm.deleted_at IS NULL OR ccm.deleted_at > NOW()))::int AS linked_control_count
     FROM "${schema}".obligations o
     WHERE o.obligation_id = $1 AND (o.deleted_at IS NULL OR o.deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT o.*,
       (SELECT COUNT(*) FROM "${schema}".compliance_control_mappings ccm WHERE ccm.obligation_id = o.obligation_id AND (ccm.deleted_at IS NULL OR ccm.deleted_at > NOW()))::int AS linked_control_count
     FROM "${schema}".obligations o
     WHERE ${where}
     ORDER BY
       CASE o.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       o.due_date ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT snapshot_id, tenant_id, overall_score, readiness_level, framework_scores, gap_count, snapshot_at
     FROM "${schema}".ksa_regulatory_readiness_snapshots
     WHERE tenant_id = $1
     ORDER BY snapshot_at DESC
     LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".ksa_regulatory_readiness_snapshots
       (tenant_id, overall_score, readiness_level, framework_scores, gap_count, snapshot_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING snapshot_id, snapshot_at`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT obligation_id, title_en, framework_code, due_date,
       EXTRACT(DAY FROM NOW() - due_date)::int AS days_overdue
     FROM "${schema}".obligations
     WHERE status = 'overdue'
       AND (deleted_at IS NULL OR deleted_at > NOW())
       ${frameworkCode ? `AND framework_code = '${frameworkCode}'` : ''}
     LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.control_code, c.title, c.framework_code
     FROM "${schema}".controls c
     WHERE c.implementation_status IN ('implemented', 'effective')
       AND (c.deleted_at IS NULL OR c.deleted_at > NOW())
       ${fwCondition}
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".evidence_evidences e
         WHERE e.entity_type = 'control' AND e.entity_id = c.control_id::text
           AND e.status IN ('accepted', 'submitted')
           AND (e.deleted_at IS NULL OR e.deleted_at > NOW())
       )
     LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.control_code, c.title, c.framework_code,
       COALESCE(c.implementation_status, 'not_started') AS implementation_status
     FROM "${schema}".controls c
     WHERE (c.implementation_status IN ('not_implemented', 'not_started') OR c.implementation_status IS NULL)
       AND (c.deleted_at IS NULL OR c.deleted_at > NOW())
       ${fwCondition}
     LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT framework_code FROM "${schema}".controls WHERE (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS overdue_count
       FROM "${schema}".obligations
       WHERE framework_code = $1
         AND status = 'overdue'
         AND (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(DISTINCT c.control_id)::int AS controls_with_evidence,
         COUNT(DISTINCT c.control_id) FILTER (WHERE e.evidence_id IS NULL)::int AS controls_without_evidence
       FROM "${schema}".controls c
       LEFT JOIN "${schema}".evidence_evidences e
         ON e.entity_type = 'control' AND e.entity_id = c.control_id::text
         AND e.status IN ('accepted', 'submitted') AND (e.deleted_at IS NULL OR e.deleted_at > NOW())
       WHERE c.framework_code = $1 AND (c.deleted_at IS NULL OR c.deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective'))::int AS implemented,
         COUNT(*) FILTER (WHERE implementation_status = 'partial')::int AS partial,
         COUNT(*) FILTER (WHERE implementation_status IN ('not_implemented', 'not_started') OR implementation_status IS NULL)::int AS not_implemented
       FROM "${schema}".controls
       WHERE framework_code = $1 AND (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".ksa_regulatory_obligations WHERE obligation_id = $1`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE status = 'met')::int AS met, COUNT(*) FILTER(WHERE status IN ('not_met','overdue'))::int AS gaps FROM "${schema}".ksa_regulatory_obligations WHERE authority_code = $1`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".ksa_regulatory_changes WHERE change_id = $1`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".frameworks SET status = 'disabled', updated_at = NOW() WHERE framework_code = $1`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".frameworks (framework_code, framework_name, status, created_at, updated_at)
     VALUES ($1, $2, 'active', NOW(), NOW())
     ON CONFLICT (framework_code) DO UPDATE SET status = 'active', updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT authority_code, authority_name_en, authority_name_ar, authority_type, authority_acronym, is_active
     FROM public.lookup_ksa_regulatory_authorities
     WHERE is_active = true
     ORDER BY authority_acronym`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT framework_code FROM "${schema}".frameworks WHERE framework_code = $1 AND (status IN ('active', 'enabled') OR status IS NULL)`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT framework_code FROM "${schema}".frameworks WHERE status IN ('active', 'enabled') OR status IS NULL`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT change_id FROM "${schema}".regulatory_changes
         WHERE affected_frameworks::text ILIKE $1 AND created_at > NOW() - INTERVAL '90 days'
         LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT framework_code, version, last_updated
       FROM public.regulatory_frameworks
       WHERE framework_code = ANY($1::text[]) AND last_updated > NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".regulatory_changes
       SET impact_assessment = $1,
           status = CASE WHEN status = 'identified' THEN 'impact_assessed' ELSE status END,
           updated_at = NOW()
       WHERE change_id = $2`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective')) AS implemented,
         COUNT(*) AS total
       FROM "${schema}".controls
       WHERE deleted_at IS NULL OR deleted_at > NOW()`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT control_id, control_code, control_title, framework_id, implementation_status
         FROM "${schema}".controls
         WHERE (framework_id = ANY($1::text[]) OR control_id = ANY($2::text[]))
         ORDER BY control_code`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `SELECT change_id, regulation_name AS title, change_summary AS description,
                regulator_id AS source_regulator, change_type, impact_level,
                affected_domains AS affected_frameworks, affected_controls,
                effective_date
         FROM public.regulatory_changes WHERE change_id = $1`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `SELECT change_id, title, description, source_regulator, change_type, impact_level,
              affected_frameworks, affected_controls, affected_policies, effective_date
       FROM "${schema}".regulatory_changes
       WHERE change_id = $1`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".regulatory_change_responses (
          change_id, tenant_id, responded_by, response_plan, response_notes,
          target_completion_date, responded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (change_id, tenant_id) DO UPDATE SET
          responded_by = $3, response_plan = COALESCE($4, regulatory_change_responses.response_plan),
          response_notes = COALESCE($5, regulatory_change_responses.response_notes),
          target_completion_date = COALESCE($6, regulatory_change_responses.target_completion_date),
          responded_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".regulatory_change_notifications
       SET acknowledged_at = NOW()
       WHERE change_id = $1 AND tenant_id = $2 AND acknowledged_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".regulatory_changes
       SET status = CASE
             WHEN status IN ('identified', 'under_review') THEN 'impact_assessed'
             ELSE status
           END,
           assigned_to = COALESCE(assigned_to, $2),
           implementation_plan = COALESCE($3, implementation_plan),
           updated_at = NOW()
       WHERE change_id = $1`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT change_id, title, description AS change_summary, source_regulator AS regulator_id,
              change_type, impact_level, affected_frameworks, affected_controls,
              effective_date, status, created_at AS detected_at,
              owner, assigned_to, implementation_plan
       FROM "${schema}".regulatory_changes
       ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total FROM "${schema}".regulatory_changes ${where}`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".regulatory_change_notifications (
        tenant_id, change_id, notification_type, priority, message_en, action_required
      ) SELECT $1, unnest($2::text[]), 'change_detected', 'medium', 'Regulatory change tracked by system', true
      ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `SELECT change_id, source_regulator AS regulator_id, title, change_type,
              description AS change_summary, impact_level,
              affected_frameworks, affected_controls,
              effective_date, status, created_at AS detected_at
       FROM "${schema}".regulatory_changes
       WHERE status NOT IN ('closed', 'verified')
       ORDER BY created_at DESC
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `SELECT change_id, regulator_id, framework_code, regulation_name, change_type,
              change_summary, impact_level, affected_domains, affected_controls,
              published_date, effective_date, compliance_deadline, response_status, detected_at
       FROM public.regulatory_changes
       WHERE (framework_code = ANY($1::text[]) OR affected_domains && $1::text[])
         AND response_status IN ('pending_review', 'impact_assessed', 'implementation_planned')
       ORDER BY detected_at DESC
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `SELECT framework_id, framework_code, framework_name FROM "${schema}".frameworks WHERE status = 'active' OR status IS NULL`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective')) AS implemented
       FROM "${schema}".controls
       WHERE framework_id = $1 AND (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS gaps FROM "${schema}".controls
         WHERE framework_id = $1
           AND implementation_status NOT IN ('implemented', 'effective', 'not_applicable')
           AND (deleted_at IS NULL OR deleted_at > NOW())`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `SELECT
         framework_id,
         COALESCE(domain, 'General') AS domain_name,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective')) AS implemented,
         COUNT(*) FILTER (WHERE implementation_status NOT IN ('implemented', 'effective', 'not_applicable')) AS at_risk
       FROM "${schema}".controls
       WHERE deleted_at IS NULL OR deleted_at > NOW()
       GROUP BY framework_id, domain
       HAVING COUNT(*) > 0
       ORDER BY COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective'))::float / GREATEST(COUNT(*), 1) ASC
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".regulatory_changes WHERE status NOT IN ('closed', 'verified', 'implemented')`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective')) AS implemented,
         COUNT(DISTINCT framework_id) AS framework_count
       FROM "${schema}".controls
       WHERE deleted_at IS NULL OR deleted_at > NOW()`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".compliance_obligations
     WHERE due_date < NOW() AND status != 'compliant' LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total, COALESCE(AVG(CASE WHEN status = 'compliant' THEN 100 ELSE 0 END), 0) AS rate
     FROM "${schema}".compliance_obligations`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT framework_code FROM "${schema}".compliance_frameworks WHERE is_active = true`;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".regulatory_briefs (
        tenant_id, brief_text_en, brief_text_ar, key_metrics, priorities_json, generated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `SELECT framework_id, framework_code,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective')) AS implemented
       FROM "${schema}".controls
       WHERE deleted_at IS NULL OR deleted_at > NOW()
       GROUP BY framework_id, framework_code`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `SELECT obligation_id, title_en, compliance_deadline, status
       FROM "${schema}".obligations
       WHERE compliance_deadline BETWEEN $1 AND $2
       ORDER BY compliance_deadline`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `SELECT change_id, title, effective_date, status
       FROM "${schema}".regulatory_changes
       WHERE effective_date BETWEEN $1 AND $2
       ORDER BY effective_date`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".tenant_preferences (key, value, updated_at)
       VALUES ('last_regulatory_update_check', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `SELECT change_id, framework_code, regulation_name, change_type, change_summary,
              affected_controls, detected_at
       FROM public.regulatory_changes
       WHERE framework_code = ANY($1::text[])
         AND detected_at > $2::timestamptz
         AND response_status = 'pending_review'
       ORDER BY detected_at DESC
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `SELECT framework_code, version, last_updated, change_log
       FROM public.regulatory_frameworks
       WHERE framework_code = ANY($1::text[])
         AND last_updated > $2::timestamptz`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `SELECT value FROM "${schema}".tenant_preferences WHERE key = 'last_regulatory_update_check'`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `SELECT framework_id, framework_code, framework_name FROM "${schema}".frameworks WHERE status = 'active' OR status IS NULL`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".ksa_regulatory_readiness_snapshots WHERE status = 'draft' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".ksa_regulatory_readiness_snapshots WHERE status = 'gap_open' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".ksa_regulatory_readiness_snapshots WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'ksa-regulatory' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'ksa-regulatory','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workspace_profile WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `SELECT schedule_id, control_id, enabled, cron_expression, last_reminded_at
           FROM "${schema}".evidence_schedules
           WHERE enabled = true`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `SELECT task_id, control_id, title, status, priority, due_date, evidence_type, updated_at
           FROM "${schema}".evidence_tasks
           WHERE status != 'cancelled'
           ORDER BY due_date ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, risk_name, risk_category, likelihood, impact, risk_score,
                  status, treatment_status, owner, updated_at
           FROM "${schema}".risks
           WHERE status IN ('open', 'mitigating', 'active')
           ORDER BY risk_score DESC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `SELECT framework_code, framework_name, status, version
           FROM "${schema}".frameworks
           WHERE status = 'active'
           ORDER BY framework_code`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `SELECT control_id, control_name, framework_code, domain, compliance_status,
                  criticality, status, implementation_status, owner, updated_at
           FROM "${schema}".controls
           WHERE status = 'active'
           ORDER BY framework_code, control_id`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".report_schedules
       (report_type, parameters, cron_expression, enabled, subscribers, created_by)
     VALUES ($1, $2::jsonb, $3, true, $4::jsonb, $5)
     ON CONFLICT (schedule_id) DO UPDATE SET
       cron_expression = EXCLUDED.cron_expression,
       subscribers = EXCLUDED.subscribers,
       enabled = true
     RETURNING schedule_id, report_type, cron_expression, enabled`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".reports
       (title, type, parameters, content, format, language, status, generated_by, generated_at)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, 'html', $5, 'completed', $6, NOW())
     RETURNING report_id`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `SELECT template_id, name, key, description, category, parameters_schema, is_active
     FROM "${schema}".report_templates
     WHERE is_active = true
     ORDER BY name`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".ksa_regulatory_readiness_snapshots WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND module = 'ksa-regulatory' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".ksa_regulatory_readiness_snapshots SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT assignee)::int AS active_assignees
       FROM "${schema}".process_tasks
       WHERE status = 'completed' AND updated_at > NOW() - INTERVAL '30 days'`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT t.team_id)::int AS teams_with_members,
              COUNT(DISTINCT tm.user_id)::int AS active_members
       FROM "${schema}".teams t
       JOIN "${schema}".team_members tm ON tm.team_id = t.team_id AND tm.status = 'active'
       WHERE t.status = 'active'`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total_users,
              COUNT(DISTINCT role)::int AS distinct_roles
       FROM "${schema}".user_roles
       WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `SELECT
         (SELECT COUNT(*)::int FROM "${schema}".dashboards WHERE status = 'active') AS dashboards,
         (SELECT COUNT(*)::int FROM "${schema}".notification_queue WHERE created_at > NOW() - INTERVAL '30 days') AS recent_alerts`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total
       FROM "${schema}".integrations
       WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `SELECT
         (SELECT COUNT(*)::int FROM "${schema}".workflows WHERE status = 'active') AS active_workflows,
         (SELECT COUNT(*)::int FROM "${schema}".evidence_schedules WHERE enabled = true) AS active_schedules,
         (SELECT COUNT(*)::int FROM "${schema}".report_schedules WHERE enabled = true) AS report_schedules`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total
       FROM "${schema}".frameworks
       WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'completed' OR status = 'approved')::int AS collected,
              COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '60 days')::int AS fresh
       FROM "${schema}".evidence_tasks`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE compliance_status = 'compliant')::int AS compliant,
              COUNT(*) FILTER (WHERE compliance_status = 'partially_compliant')::int AS partial,
              COUNT(*) FILTER (WHERE criticality = 'critical' AND compliance_status <> 'compliant')::int AS critical_gaps
       FROM "${schema}".controls
       WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS recent_updates
       FROM "${schema}".risks
       WHERE updated_at > NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE treatment_status = 'treated' OR treatment_status = 'accepted')::int AS addressed
       FROM "${schema}".risks
       WHERE treatment_status IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE risk_score IS NOT NULL)::int AS scored,
              COUNT(*) FILTER (WHERE owner IS NOT NULL)::int AS owned,
              COUNT(*) FILTER (WHERE status = 'open' OR status = 'mitigating')::int AS active
       FROM "${schema}".risks`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'active')::int AS active
       FROM "${schema}".workflows`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT t.team_id)::int AS teams,
              COUNT(DISTINCT tm.user_id)::int AS members
       FROM "${schema}".teams t
       LEFT JOIN "${schema}".team_members tm ON tm.team_id = t.team_id AND tm.status = 'active'
       WHERE t.status = 'active'`;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE responsible IS NOT NULL AND accountable IS NOT NULL)::int AS complete
       FROM "${schema}".raci_matrix`;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'approved' OR status = 'active')::int AS approved
       FROM "${schema}".policies`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = `SELECT industry FROM "${schema}".workspace_profile WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    const query = `SELECT ts.sector_code, COALESCE(s.name_en, ts.sector_code) AS sector_name
     FROM public.tenant_sectors ts
     LEFT JOIN public.sectors s ON s.sector_code = ts.sector_code
     WHERE ts.tenant_id = $1
     ORDER BY ts.is_primary DESC
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".dashboard_snapshots (snapshot_date, data)
     VALUES (CURRENT_DATE, $1::jsonb)
     ON CONFLICT (snapshot_date) DO UPDATE SET
       data = "${schema}".dashboard_snapshots.data || $1::jsonb`;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    const query = `SELECT snapshot_date::text AS date,
            COALESCE((data->>'maturity_overall')::int, 0) AS overall_score,
            data->'maturity_dimensions' AS dimensions
     FROM "${schema}".dashboard_snapshots
     WHERE snapshot_date >= $1::date AND snapshot_date <= $2::date
       AND data ? 'maturity_overall'
     ORDER BY snapshot_date ASC`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    const query = `SELECT ms.overall_score, ms.dimension_scores
       FROM public.maturity_snapshots ms
       JOIN public.tenant_sectors ts ON ts.tenant_id = ms.tenant_id
       WHERE ts.sector_code = $1
         AND ms.tenant_id != $2
         AND ms.assessed_at > NOW() - INTERVAL '90 days'
       ORDER BY ms.assessed_at DESC`;
    return safeQuery(query, args);
  }

}
