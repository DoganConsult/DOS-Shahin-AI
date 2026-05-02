// Auto-extracted Evidence repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class EvidenceAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total
       FROM "${schema}".evidence_quality_assessments
       WHERE assessed_by LIKE 'ai:%' OR assessed_by = 'evidence-ai'`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT assessed_at
       FROM "${schema}".evidence_quality_assessments
       WHERE assessed_by LIKE 'ai:%' OR assessed_by = 'evidence-ai'
       ORDER BY assessed_at DESC
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_duplicate_candidates
           (evidence_a_id, evidence_b_id, similarity_score, detection_method, detected_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (evidence_a_id, evidence_b_id) DO UPDATE
           SET similarity_score = GREATEST(evidence_duplicate_candidates.similarity_score, EXCLUDED.similarity_score),
               detection_method = EXCLUDED.detection_method
         RETURNING id`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, evidence_type
         FROM "${schema}".evidence
         WHERE evidence_id != $1
           AND evidence_type = $2
           AND status NOT IN ('deleted', 'archived')
           AND created_at BETWEEN $3::timestamptz - INTERVAL '7 days' AND $3::timestamptz + INTERVAL '7 days'
         LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, evidence_type
         FROM "${schema}".evidence
         WHERE evidence_id != $1
           AND status NOT IN ('deleted', 'archived')
           AND (${ilikeConditions})
         LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, evidence_type
           FROM "${schema}".evidence
           WHERE content_hash = $1
             AND evidence_id != $2
             AND status NOT IN ('deleted', 'archived')
           LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, evidence_type, content_hash, created_at, valid_from, valid_to
     FROM "${schema}".evidence
     WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT policy_id AS entity_id, title AS entity_title,
              (SELECT COUNT(*) FROM unnest(ARRAY[${words.map((_, i) => `$${i + 1}`).join(',')}]) w
               WHERE (COALESCE(title, '') || ' ' || COALESCE(description, '')) ILIKE '%' || w || '%'
              ) AS match_count
       FROM "${schema}".policies
       WHERE ${ilikeConditions}
       ORDER BY match_count DESC
       LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT risk_id AS entity_id, title AS entity_title,
              (SELECT COUNT(*) FROM unnest(ARRAY[${words.map((_, i) => `$${i + 1}`).join(',')}]) w
               WHERE (COALESCE(title, '') || ' ' || COALESCE(description, '')) ILIKE '%' || w || '%'
              ) AS match_count
       FROM "${schema}".risks
       WHERE ${ilikeConditions}
       ORDER BY match_count DESC
       LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT control_id AS entity_id, title AS entity_title,
              (SELECT COUNT(*) FROM unnest(ARRAY[${words.map((_, i) => `$${i + 1}`).join(',')}]) w
               WHERE (COALESCE(title, '') || ' ' || COALESCE(description, '')) ILIKE '%' || w || '%'
              ) AS match_count
       FROM "${schema}".controls
       WHERE ${ilikeConditions}
       ORDER BY match_count DESC
       LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, description, evidence_type, control_id, framework_code
     FROM "${schema}".evidence
     WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT evidence_type FROM "${schema}".evidence WHERE evidence_type IS NOT NULL LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title FROM "${schema}".controls ORDER BY control_id LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".${table} SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".${table} (code, label_en, label_ar) VALUES ($1, $2, $3) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".${table} (code, label_en, label_ar, description, category) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".${table} (code, label_en, label_ar, sort_order) VALUES ($1, $2, $3, $4) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_admin_settings
     SET setting_value = $1, updated_by = $2, updated_at = NOW()
     WHERE setting_key = $3 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT setting_key, setting_value, description, updated_at FROM "${schema}".evidence_admin_settings ORDER BY setting_key`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_rejection_reasons WHERE is_active = true ORDER BY label_en`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_quality_rules WHERE is_active = true ORDER BY rule_name`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_confidentiality_levels ORDER BY sort_order`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_source_types WHERE is_active = true ORDER BY label_en`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_types WHERE is_active = true ORDER BY label_en`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT id, tag_key, tag_value, created_at FROM "${schema}".evidence_tags WHERE evidence_id = $1 ORDER BY tag_key`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".evidence_tags WHERE id = $1 AND evidence_id = $2`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_tags (evidence_id, tag_key, tag_value)
       VALUES ($1, $2, $3) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.evidence_code, e.title, e.description, e.evidence_type,
            e.source_system_name, e.status, e.freshness_status, e.quality_status,
            e.reusable_flag, e.owner_user_id, e.framework_code, e.control_id,
            e.valid_from, e.valid_to, e.created_at, e.updated_at,
            (SELECT COUNT(*) FROM "${schema}".evidence_links el WHERE el.evidence_id = e.evidence_id) AS link_count
     FROM "${schema}".evidence e
     WHERE ${whereClause}
     ORDER BY e.updated_at DESC
     LIMIT $${idx++} OFFSET $${idx}`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total FROM "${schema}".evidence e WHERE ${whereClause}`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence SET ${setClauses.join(', ')} WHERE evidence_id = $${idx} AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_freshness_records WHERE evidence_id = $1 ORDER BY updated_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT id, linked_object_type, linked_object_id, link_type, notes, created_by, created_at
     FROM "${schema}".evidence_links WHERE evidence_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT id, tag_key, tag_value, created_at FROM "${schema}".evidence_tags WHERE evidence_id = $1 ORDER BY tag_key`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `SELECT e.*,
            (SELECT COUNT(*) FROM "${schema}".evidence_links el WHERE el.evidence_id = e.evidence_id) AS link_count,
            (SELECT COUNT(*) FROM "${schema}".evidence_reviews er WHERE er.evidence_id = e.evidence_id AND er.deleted_at IS NULL) AS review_count,
            (SELECT COUNT(*) FROM "${schema}".evidence_package_items epi WHERE epi.evidence_id = e.evidence_id) AS package_count
     FROM "${schema}".evidence e
     WHERE e.evidence_id = $1 AND e.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT e.*, ec.retention_days
     FROM "${schema}".evidence e
     JOIN "${schema}".evidence_catalog ec
       ON e.control_id = ec.control_id
     WHERE e.created_at + (ec.retention_days || ' days')::INTERVAL
           <= CURRENT_DATE + ($1 || ' days')::INTERVAL
       AND e.created_at + (ec.retention_days || ' days')::INTERVAL
           >= CURRENT_DATE
     ORDER BY e.created_at ASC`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT cer.evidence_type_code, cer.freshness_days
     FROM "${schema}".control_evidence_requirements cer
     WHERE cer.control_id = $1 AND cer.freshness_days IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT ON (title) title, created_at
     FROM "${schema}".evidence WHERE control_id = $1
     ORDER BY title, created_at DESC`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT evidence_type FROM "${schema}".evidence_catalog WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_catalog
      (control_id, evidence_type, source_system, frequency,
       naming_standard, retention_days, attach_role, approve_role)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT control_id, evidence_type, source_system, frequency,
            naming_standard, retention_days, attach_role, approve_role
     FROM "${schema}".evidence_catalog
     WHERE control_id = $1
     ORDER BY evidence_type ASC`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT metadata_kv->'multimodal_analysis' as analysis
     FROM "${schema}".evidence
     WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence
       SET metadata_kv = COALESCE(metadata_kv, '{}'::jsonb) || $1::jsonb
       WHERE evidence_id = $2`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence
     SET quality_tier = $1, updated_at = NOW()
     WHERE evidence_id = $2`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.file_path, e.content_type, e.evidence_type,
            f.file_id, f.content_type as file_content_type, f.original_filename
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".file_storage f ON e.file_path = f.file_id::text
     WHERE e.evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS evidence_count,
       COALESCE(AVG(
         CASE quality_tier
           WHEN 'A' THEN 90
           WHEN 'B' THEN 65
           WHEN 'C' THEN 25
           ELSE 50
         END
       )::numeric, 50) AS avg_score
     FROM "${schema}".evidence
     WHERE control_id = $1 AND status NOT IN ('expired', 'rejected', 'archived')`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id FROM "${schema}".evidence
     WHERE control_id = $1 AND status NOT IN ('expired', 'rejected', 'archived')`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_scores
       (evidence_id, completeness_score, freshness_score, verification_score, integrity_score, reuse_score, composite_score, computed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (evidence_id) DO UPDATE SET
         completeness_score = EXCLUDED.completeness_score,
         freshness_score = EXCLUDED.freshness_score,
         verification_score = EXCLUDED.verification_score,
         integrity_score = EXCLUDED.integrity_score,
         reuse_score = EXCLUDED.reuse_score,
         composite_score = EXCLUDED.composite_score,
         computed_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence
     SET quality_tier = $1, updated_at = NOW()
     WHERE evidence_id = $2`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT freshness_days, required_cadence, evidence_type_code
     FROM "${schema}".control_evidence_requirements
     WHERE control_id = $1 AND deleted_at IS NULL
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.control_id, e.title, e.description, e.file_path, e.content,
            e.submitted_at, e.expiry_date, e.status, e.source_type, e.submitted_by,
            e.owner_user_id, e.reviewer_user_id, e.system_reference, e.ticket_id, e.content_hash,
            e.evidence_type, e.quality_tier
     FROM "${schema}".evidence e
     WHERE e.evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT dimension, weight FROM "${schema}".evidence_quality_rules WHERE active = true`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT evidence_type_code
     FROM "${schema}".control_evidence_requirements
     WHERE control_id = $1 AND deleted_at IS NULL
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `SELECT outcome, reviewed_at
     FROM "${schema}".evidence_reviews
     WHERE evidence_id = $1 AND deleted_at IS NULL
     ORDER BY reviewed_at DESC
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT control_id) as n
     FROM "${schema}".evidence
     WHERE evidence_type = (SELECT evidence_type FROM "${schema}".evidence WHERE evidence_id = $1)
       AND evidence_id != $1`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT evidence_type) as n FROM "${schema}".evidence
     WHERE control_id = $1 AND status NOT IN ('expired', 'rejected', 'archived')`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as n FROM "${schema}".control_evidence_requirements WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = 'control_evidence_requirements'`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = controlQuery;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT evidence_type FROM "${schema}".evidence
     WHERE control_id = $1 AND status NOT IN ('expired', 'rejected', 'archived')`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT evidence_type_code FROM "${schema}".control_evidence_requirements
       WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = 'control_evidence_requirements'`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, control_id, title, status, created_at, updated_at, expiry_date
     FROM "${schema}".evidence
     ORDER BY updated_at ASC NULLS FIRST
     LIMIT 500`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, status, content_hash, created_at, expiry_date
     FROM "${schema}".evidence LIMIT 500`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `SELECT c.framework_code,
            COUNT(DISTINCT c.control_id) as total_controls,
            COUNT(DISTINCT e.control_id) as evidenced_controls
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".evidence e ON e.control_id = c.control_id
     WHERE c.framework_code IS NOT NULL
     GROUP BY c.framework_code`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as n FROM "${schema}".evidence GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT control_id) as n FROM "${schema}".evidence WHERE control_id IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as n FROM "${schema}".controls`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id FROM "${schema}".evidence WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.control_id, e.status, e.created_at, e.updated_at,
            e.content_hash, e.previous_hash, e.chain_position, e.framework_code,
            e.expiry_date
     FROM "${schema}".evidence e
     WHERE e.evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_collection_runs
       (job_id, evidence_id, source_reference, metadata)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_collection_jobs
     SET status = $1, items_collected = $2, items_failed = $3,
         error_message = $4, completed_at = NOW()
     WHERE id = $5
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_collection_rules SET last_run_at = NOW() WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_collection_jobs
       (rule_id, connector_id, status, started_at)
     VALUES ($1, $2, 'running', NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_collection_runs
     WHERE job_id = $1 ORDER BY collected_at DESC`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `SELECT j.*, r.name AS rule_name, r.connector_type
     FROM "${schema}".evidence_collection_jobs j
     LEFT JOIN "${schema}".evidence_collection_rules r ON r.id = j.rule_id
     ${where}
     ORDER BY j.created_at DESC
     LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".evidence_collection_rules WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_collection_rules SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_collection_rules
       (name, description, connector_type, evidence_type_code, control_id_pattern,
        source_config, cron_expression, active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_collection_rules ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_tasks
         SET status = 'Submitted', updated_at = NOW(),
             last_collected_at = NOW()
         WHERE task_id = $1`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence
          (tenant_id, control_id, evidence_type, title, description,
           source, status, metadata, collected_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'submitted', $7::jsonb, NOW())
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `SELECT et.task_id, et.control_id, et.evidence_type, et.task_name,
            et.description, et.status
     FROM "${schema}".evidence_tasks et
     WHERE et.status IN ('pending', 'Open', 'overdue')
       AND et.evidence_type IS NOT NULL
     ORDER BY et.created_at ASC
     LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `SELECT connector_id, connector_type, config, status
     FROM "${schema}".connectors
     WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `
    SELECT COUNT(*)::int AS total FROM "${schema}".evidence_schedules
  `;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `
    DELETE FROM "${schema}".evidence_workflow_registrations WHERE tenant_id = $1
  `;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".evidence_workflow_registrations SET status = 'active' WHERE status = 'paused'
  `;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".evidence_schedules SET enabled = true WHERE enabled = false
  `;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".evidence_workflow_registrations SET status = 'paused' WHERE status = 'active'
  `;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".evidence_schedules SET enabled = false WHERE enabled = true
  `;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `
              INSERT INTO "${schema}".evidence_sla_events
                (schedule_id, tenant_id, event_type, escalation_level, escalation_action,
                 sla_consumed_percent, details)
              VALUES ($1, $2, 'escalation', $3, $4, $5, $6)
            `;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `
            SELECT id FROM "${schema}".evidence_sla_events
            WHERE schedule_id = $1 AND event_type = 'escalation' AND escalation_level = $2
            AND created_at > NOW() - INTERVAL '7 days' LIMIT 1
          `;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `
        INSERT INTO "${schema}".evidence_sla_events
          (schedule_id, tenant_id, event_type, sla_consumed_percent, details)
        VALUES ($1, $2, 'warning', $3, $4)
        ON CONFLICT DO NOTHING
      `;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `
        INSERT INTO "${schema}".evidence_workflow_registrations
          (schedule_id, control_id, tenant_id, workflow_type, frequency_hours,
           sla_hours, status, registered_at)
        VALUES ($1, $2, $3, 'evidence_lifecycle', $4, $5, 'active', NOW())
        ON CONFLICT (schedule_id) DO UPDATE SET
          status = 'active', frequency_hours = $4, sla_hours = $5, registered_at = NOW()
      `;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `
        SELECT id FROM "${schema}".evidence_workflow_registrations
        WHERE schedule_id = $1 AND status = 'active' LIMIT 1
      `;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `
    SELECT id, control_id, cron_expression, reminder_text, assigned_to, enabled,
           last_reminded_at, COALESCE(sla_hours, 72) AS sla_hours,
           COALESCE(frequency_hours, 720) AS frequency_hours
    FROM "${schema}".evidence_schedules
    WHERE enabled = true
    ORDER BY control_id ASC
  `;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_verification_events (evidence_id, event_type, verified_by, notes)
       VALUES ($1, 'refresh_requested', $2, 'Bulk refresh requested')`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence
     SET freshness_status = 'stale', updated_at = NOW()
     WHERE evidence_id IN (${placeholders})
       AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_freshness_records
       SET expires_at = COALESCE(expires_at, NOW()) + ($1 || ' days')::INTERVAL,
           updated_at = NOW()
       WHERE evidence_id = $2`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence
     SET valid_to = COALESCE(valid_to, NOW()) + ($${evidenceIds.length + 1} || ' days')::INTERVAL,
         updated_at = NOW()
     WHERE evidence_id IN (${placeholders})
       AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_verification_events (evidence_id, event_type, verified_by, notes)
       VALUES ($1, 'bulk_stale_mark', $2, 'Bulk marked as stale')`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence
     SET freshness_status = 'stale', updated_at = NOW()
     WHERE evidence_id IN (${placeholders})
       AND freshness_status != 'stale'
       AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `SELECT
       id, evidence_id, last_verified_at, expires_at,
       freshness_band, refresh_due_at, verification_method,
       verified_by, created_at, updated_at
     FROM "${schema}".evidence_freshness_records
     WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `SELECT
       id, evidence_id, event_type, verified_by,
       verified_at, notes, created_at
     FROM "${schema}".evidence_verification_events
     WHERE evidence_id = $1
     ORDER BY verified_at DESC`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_freshness_records
           SET freshness_band = $1, updated_at = NOW()
           WHERE evidence_id = $2`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence
         SET freshness_status = $1, updated_at = NOW()
         WHERE evidence_id = $2`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `SELECT
       e.evidence_id,
       e.freshness_status,
       e.valid_to,
       fr.last_verified_at
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_freshness_records fr
       ON fr.evidence_id = e.evidence_id`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `SELECT
       e.evidence_id, e.title, e.control_id, e.status,
       e.freshness_status, e.valid_from, e.valid_to,
       e.updated_at,
       fr.last_verified_at, fr.expires_at, fr.freshness_band,
       fr.refresh_due_at, fr.verification_method, fr.verified_by
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_freshness_records fr
       ON fr.evidence_id = e.evidence_id
     WHERE e.freshness_status = 'stale'
     ORDER BY fr.last_verified_at ASC NULLS FIRST`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `SELECT
       e.evidence_id, e.title, e.control_id, e.status,
       e.freshness_status, e.valid_from, e.valid_to,
       fr.last_verified_at, fr.expires_at, fr.freshness_band,
       fr.refresh_due_at, fr.verification_method
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_freshness_records fr
       ON fr.evidence_id = e.evidence_id
     WHERE e.valid_to IS NOT NULL
       AND e.valid_to >= NOW()
       AND e.valid_to < NOW() + ($1 || ' days')::interval
     ORDER BY e.valid_to ASC`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE freshness_status = 'current')::int AS current,
       COUNT(*) FILTER (WHERE freshness_status = 'stale')::int AS stale,
       COUNT(*) FILTER (WHERE freshness_status = 'expired')::int AS expired,
       COUNT(*) FILTER (WHERE freshness_status IS NULL OR freshness_status = 'unknown')::int AS never_verified,
       COUNT(*) FILTER (
         WHERE valid_to IS NOT NULL
           AND valid_to >= NOW()
           AND valid_to < NOW() + INTERVAL '7 days'
       )::int AS expiring_this_week,
       COUNT(*) FILTER (
         WHERE valid_to IS NOT NULL
           AND valid_to >= NOW()
           AND valid_to < NOW() + INTERVAL '30 days'
       )::int AS expiring_this_month
     FROM "${schema}".evidence`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `SELECT setting_value FROM "${schema}".evidence_admin_settings
     WHERE setting_key = 'freshness_thresholds'`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `SELECT id, evidence_id, verification_type, result, verifier,
            details, verified_at
     FROM "${schema}".evidence_verification_events
     WHERE evidence_id = $1
     ORDER BY verified_at DESC`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_verification_events
       (id, evidence_id, verification_type, result, verifier, details, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT actor
     FROM "${schema}".evidence_provenance_records
     WHERE actor IS NOT NULL
     ORDER BY actor`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `SELECT event_type, COUNT(*)::int AS cnt
     FROM "${schema}".evidence_provenance_records
     GROUP BY event_type
     ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total
     FROM "${schema}".evidence_provenance_records`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `SELECT id, evidence_id, event_type, actor, actor_role,
            event_data, ip_address, created_at
     FROM "${schema}".evidence_provenance_records
     WHERE evidence_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_provenance_records
       (id, evidence_id, event_type, actor, actor_role, event_data, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".evidence_schedules WHERE schedule_id = $1`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_schedules SET ${sets.join(", ")} WHERE schedule_id = $${idx} RETURNING *`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_schedules ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_schedules
      (control_id, cron_expression, reminder_text, assigned_to)
     VALUES ($1, $2, $3, $4)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS active_holds
     FROM "${schema}".evidence_legal_holds
     WHERE active = true`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(DISTINCT evidence_id) AS total_objects,
       COALESCE(SUM(size_bytes), 0) AS total_size_bytes,
       COUNT(*) AS total_versions,
       MAX(uploaded_at) AS last_upload_at
     FROM "${schema}".evidence_vault_versions`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_integrity_checks
     (evidence_id, version_id, stored_hash, computed_hash, is_valid, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6)`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `SELECT version_id, bucket, object_key, sha256_hash
     FROM "${schema}".evidence_vault_versions
     WHERE evidence_id = $1
     ORDER BY uploaded_at DESC
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence
     SET legal_hold = false, updated_at = NOW()
     WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_legal_holds
     SET active = false, removed_by = $1, removed_at = $2, remove_reason = $3
     WHERE hold_id = $4`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `SELECT bucket, object_key, version_id FROM "${schema}".evidence_vault_versions
     WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `SELECT hold_id, reason, hold_until, placed_by, placed_at
     FROM "${schema}".evidence_legal_holds
     WHERE evidence_id = $1 AND active = true
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence
     SET legal_hold = true, updated_at = NOW()
     WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_legal_holds
     (hold_id, evidence_id, reason, hold_until, placed_by, placed_at, active)
     VALUES ($1, $2, $3, $4, $5, $6, true)`;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `SELECT bucket, object_key, version_id FROM "${schema}".evidence_vault_versions
     WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = `SELECT hold_id FROM "${schema}".evidence_legal_holds
     WHERE evidence_id = $1 AND active = true`;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    const query = `SELECT version_id, file_name, size_bytes, sha256_hash,
            uploaded_at, uploaded_by
     FROM "${schema}".evidence_vault_versions
     WHERE evidence_id = $1
     ORDER BY uploaded_at DESC`;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    const query = `SELECT version_id, file_name, bucket, object_key, sha256_hash,
            size_bytes, content_type, uploaded_by
     FROM "${schema}".evidence_vault_versions
     WHERE evidence_id = $1 AND version_id = $2`;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    const query = `SELECT version_id FROM "${schema}".evidence_vault_versions
       WHERE evidence_id = $1
       ORDER BY uploaded_at DESC
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence
     SET latest_version_id = $1, sha256_hash = $2, file_size = $3, updated_at = NOW()
     WHERE id = $4`;
    return safeQuery(query, args);
  }

  static async query138(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_vault_versions
     (version_id, evidence_id, file_name, bucket, object_key,
      sha256_hash, size_bytes, content_type, uploaded_by, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
    return safeQuery(query, args);
  }

  static async query139(schema: string, args: unknown[]) {
    const query = `SELECT log_id, config_id, pipeline_type, event_type, build_id, commit_hash, branch,
            job_url, artifact_urls, status, evidence_ids, error_message, created_at, processed_at
     FROM "${schema}".pipeline_webhook_logs
     WHERE tenant_id = $1 ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length}`;
    return safeQuery(query, args);
  }

  static async query140(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".pipeline_webhook_logs
         (config_id, tenant_id, pipeline_type, event_type, build_id, commit_hash, branch,
          job_url, artifact_urls, status, evidence_ids, raw_payload, processed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`;
    return safeQuery(query, args);
  }

  static async query141(schema: string, args: unknown[]) {
    const query = `SELECT control_id FROM "${schema}".ucf_controls
         WHERE control_id LIKE $1
         ORDER BY control_id`;
    return safeQuery(query, args);
  }

  static async query142(schema: string, args: unknown[]) {
    const query = `SELECT config_id, name, webhook_secret, api_key_id, control_id_pattern, evidence_type_code, metadata
     FROM "${schema}".pipeline_webhook_configs
     WHERE tenant_id = $1 AND enabled = TRUE AND pipeline_type = $2`;
    return safeQuery(query, args);
  }

  static async query143(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".pipeline_webhook_configs WHERE tenant_id = $1 AND config_id = $2`;
    return safeQuery(query, args);
  }

  static async query144(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".pipeline_webhook_configs
     (config_id, tenant_id, name, pipeline_type, webhook_secret, api_key_id,
      control_id_pattern, evidence_type_code, enabled, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (tenant_id, name) DO UPDATE SET
       pipeline_type = EXCLUDED.pipeline_type,
       webhook_secret = EXCLUDED.webhook_secret,
       api_key_id = EXCLUDED.api_key_id,
       control_id_pattern = EXCLUDED.control_id_pattern,
       evidence_type_code = EXCLUDED.evidence_type_code,
       enabled = EXCLUDED.enabled,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query145(schema: string, args: unknown[]) {
    const query = `SELECT config_id, tenant_id, name, pipeline_type, webhook_secret, api_key_id,
            control_id_pattern, evidence_type_code, enabled, metadata,
            created_at, updated_at, created_by
     FROM "${schema}".pipeline_webhook_configs
     WHERE tenant_id = $1 AND config_id = $2`;
    return safeQuery(query, args);
  }

  static async query146(schema: string, args: unknown[]) {
    const query = `SELECT config_id, tenant_id, name, pipeline_type, webhook_secret, api_key_id,
            control_id_pattern, evidence_type_code, enabled, metadata,
            created_at, updated_at, created_by
     FROM "${schema}".pipeline_webhook_configs
     WHERE tenant_id = $1 ${whereClause}
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query147(schema: string, args: unknown[]) {
    const query = `SELECT file_path FROM "${schema}".evidence WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query148(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence SET
       file_path = $1, file_size_bytes = $2,
       metadata_kv = COALESCE(metadata_kv, '{}'::jsonb) || $3::jsonb,
       updated_at = NOW()
     WHERE evidence_id = $4 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query149(schema: string, args: unknown[]) {
    const query = `SELECT et.file_extensions, et.max_size_mb
       FROM "${schema}".control_evidence_requirements cer
       JOIN public.evidence_types et ON et.evidence_code = cer.evidence_type_code
       WHERE cer.control_id::text = $1
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query150(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query151(schema: string, args: unknown[]) {
    const query = `SELECT
       et.control_id,
       COALESCE(c.control_title, c.control_title_en, et.control_id) AS control_title,
       COUNT(DISTINCT et.task_id)::int AS required_evidence,
       COUNT(DISTINCT et.task_id) FILTER (WHERE et.status IN ('completed','approved','fulfilled'))::int AS collected_evidence,
       COUNT(DISTINCT et.task_id) FILTER (WHERE et.status = 'approved')::int AS approved_evidence,
       COUNT(DISTINCT et.task_id) FILTER (WHERE et.status = 'expired')::int AS expired_evidence
     FROM "${schema}".evidence_tasks et
     LEFT JOIN "${schema}".ucf_controls c ON c.control_id = et.control_id
     WHERE et.control_id IS NOT NULL
     GROUP BY et.control_id, c.control_title, c.control_title_en
     ORDER BY
       CASE WHEN COUNT(DISTINCT et.task_id) > 0
         THEN (COUNT(DISTINCT et.task_id) FILTER (WHERE et.status IN ('completed','approved','fulfilled'))::float / COUNT(DISTINCT et.task_id)::float)
         ELSE 0
       END ASC`;
    return safeQuery(query, args);
  }

  static async query152(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS overdue_count
     FROM "${schema}".evidence_requests
     WHERE status NOT IN ('completed','cancelled','fulfilled')
       AND due_date < NOW()`;
    return safeQuery(query, args);
  }

  static async query153(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT task_id)::int AS required_count,
            COUNT(DISTINCT task_id) FILTER (WHERE status IN ('completed','approved'))::int AS fulfilled_count
     FROM "${schema}".evidence_tasks`;
    return safeQuery(query, args);
  }

  static async query154(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) FILTER (WHERE COALESCE(source_type, '') IN ('pipeline','automated','connector','api') OR created_by = 'system' OR created_by LIKE 'pipeline:%')::int AS auto_count,
       COUNT(*) FILTER (WHERE COALESCE(source_type, '') NOT IN ('pipeline','automated','connector','api') AND created_by != 'system' AND created_by NOT LIKE 'pipeline:%')::int AS manual_count
     FROM "${schema}".evidence`;
    return safeQuery(query, args);
  }

  static async query155(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status IN ('approved','active'))::int AS approved,
       COUNT(*) FILTER (WHERE status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date < NOW()))::int AS expired,
       COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date >= NOW() AND expiry_date < NOW() + INTERVAL '30 days')::int AS expiring_soon
     FROM "${schema}".evidence`;
    return safeQuery(query, args);
  }

  static async query156(schema: string, args: unknown[]) {
    const query = `SELECT owner_id, department_id, business_unit_id FROM "${schema}".evidence_evidences WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query157(schema: string, args: unknown[]) {
    const query = `SELECT from_status AS "fromStatus", to_status AS "toStatus", changed_by AS "changedBy", reason, changed_at AS "changedAt"
       FROM "${schema}".evidence_status_history
       WHERE evidence_id = $1
       ORDER BY changed_at ASC`;
    return safeQuery(query, args);
  }

  static async query158(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_status_history (evidence_id, from_status, to_status, changed_by, reason, changed_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query159(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_evidences SET status = $1, updated_at = NOW(), updated_by = $2 WHERE evidence_id = $3`;
    return safeQuery(query, args);
  }

  static async query160(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".evidence_evidences WHERE evidence_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query161(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.reviewer_id, c.title AS control_title
       FROM "${schema}".evidence_items e
       LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
       WHERE e.status = 'pending_review'
         AND e.reviewer_id IS NOT NULL
       LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query162(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.assignee_id, c.title AS control_title, e.valid_to
       FROM "${schema}".evidence_items e
       LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
       WHERE e.freshness_status = 'expiring_soon'
         AND e.assignee_id IS NOT NULL
       LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query163(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.assignee_id, c.title AS control_title, e.due_date
       FROM "${schema}".evidence_items e
       LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
       WHERE e.status = 'pending' AND e.due_date < NOW()
         AND e.assignee_id IS NOT NULL
       LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query164(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
       (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
     VALUES ($1, $2, 'evidence_package_ready', $3, $4, 'in_app', 'normal', $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query165(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
       (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
     VALUES ($1, $2, 'evidence_sla_breach', $3, $4, 'in_app', 'high', $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query166(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
       (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
     VALUES ($1, $2, 'evidence_request_overdue', $3, $4, 'in_app', 'high', $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query167(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
       VALUES ($1, $2, 'evidence_review_required', $3, $4, 'in_app', 'normal', $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query168(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
       VALUES ($1, $2, 'evidence_expiry_warning', $3, $4, 'in_app', 'normal', $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query169(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, valid_to
       FROM "${schema}".evidence
       WHERE evidence_id IN (${placeholders})`;
    return safeQuery(query, args);
  }

  static async query170(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
       (tenant_id, recipient_id, notification_type, subject, body, channel, priority, metadata, created_at)
     VALUES ($1, $2, 'evidence_collection_reminder', $3, $4, 'in_app', 'normal', $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query171(schema: string, args: unknown[]) {
    const query = `SELECT title FROM "${schema}".evidence WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query172(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence
     WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE
     ORDER BY expiry_date ASC`;
    return safeQuery(query, args);
  }

  static async query173(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query174(schema: string, args: unknown[]) {
    const query = `SELECT e.framework_code, COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.framework_code IS NOT NULL AND e.deleted_at IS NULL${fw} GROUP BY e.framework_code ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query175(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.risk_id IS NOT NULL AND e.deleted_at IS NULL${fw}`;
    return safeQuery(query, args);
  }

  static async query176(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(e.status, 'submitted') AS status, COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.deleted_at IS NULL${fw} GROUP BY COALESCE(e.status, 'submitted')`;
    return safeQuery(query, args);
  }

  static async query177(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) AS cnt FROM "${schema}".evidence_tasks GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query178(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".evidence_requests WHERE due_date < NOW() AND status NOT IN ('approved','cancelled','rejected')`;
    return safeQuery(query, args);
  }

  static async query179(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".evidence_reviews WHERE outcome IS NULL AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query180(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.expiry_date IS NOT NULL AND e.expiry_date < CURRENT_DATE AND e.deleted_at IS NULL${fw}`;
    return safeQuery(query, args);
  }

  static async query181(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.expiry_date IS NOT NULL AND e.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND e.expiry_date >= CURRENT_DATE AND e.deleted_at IS NULL${fw}`;
    return safeQuery(query, args);
  }

  static async query182(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".evidence e WHERE e.deleted_at IS NULL${fw}`;
    return safeQuery(query, args);
  }

  static async query183(schema: string, args: unknown[]) {
    const query = `SELECT e.* FROM "${schema}".evidence e
     WHERE e.deleted_at IS NULL${foundationWhere}
     ORDER BY e.chain_position ASC`;
    return safeQuery(query, args);
  }

  static async query184(schema: string, args: unknown[]) {
    const query = `SELECT e.* FROM "${schema}".evidence e
       WHERE (e.owner_user_id = $${paramIdx} OR e.submitted_by = $${paramIdx} OR e.created_by = $${paramIdx})
         AND e.deleted_at IS NULL${foundationWhere}
       ORDER BY e.chain_position ASC`;
    return safeQuery(query, args);
  }

  static async query185(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence WHERE control_id = $1 ORDER BY chain_position ASC`;
    return safeQuery(query, args);
  }

  static async query186(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_relay_queue ${where} ORDER BY created_at DESC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query187(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_relay_queue WHERE relay_id = $1`;
    return safeQuery(query, args);
  }

  static async query188(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_relay_queue SET evidence_id = $1, status = 'filed' WHERE relay_id = $2`;
    return safeQuery(query, args);
  }

  static async query189(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence SET expiry_date = NOW() + INTERVAL '${getFirstRow(retCheck)?.retention_days} days'
           WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query190(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence (title, control_id, status, source, content, created_by)
         VALUES ($1, $2, 'approved', $3, $4, $5) RETURNING evidence_id`;
    return safeQuery(query, args);
  }

  static async query191(schema: string, args: unknown[]) {
    const query = `SELECT retention_days FROM "${schema}".evidence_catalog
         WHERE control_id = $1 ORDER BY retention_days ASC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query192(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_relay_queue SET status = 'gate_failed', review_note = $1 WHERE relay_id = $2`;
    return safeQuery(query, args);
  }

  static async query193(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".evidence_catalog WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query194(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_relay_queue WHERE relay_id = $1`;
    return safeQuery(query, args);
  }

  static async query195(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_relay_queue
     SET status = $1, reviewed_by = $2, review_note = $3, resolved_at = NOW()
     WHERE relay_id = $4`;
    return safeQuery(query, args);
  }

  static async query196(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_relay_queue
         (control_id, agent_id, source_system, staged_content, confidence_score)
       VALUES ($1, 'AGENT-A03', $2, $3, $4) RETURNING relay_id, created_at`;
    return safeQuery(query, args);
  }

  static async query197(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_evidences WHERE deleted_at IS NULL AND expires_at < NOW()`;
    return safeQuery(query, args);
  }

  static async query198(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS cnt FROM "${schema}".evidence_evidences WHERE deleted_at IS NULL GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query199(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_evidences WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query200(schema: string, args: unknown[]) {
    const query = `SELECT id, provider, status, last_sync_at FROM "${schema}".evidence_connectors WHERE deleted_at IS NULL ORDER BY provider`;
    return safeQuery(query, args);
  }

  static async query201(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_evidences WHERE connector_id = $1 AND collected_at > NOW() - INTERVAL '1 day'`;
    return safeQuery(query, args);
  }

  static async query202(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.control_title, c.status,
              (SELECT COUNT(*) FROM "${schema}".evidence e
               WHERE e.control_id = c.control_id
                 AND e.status NOT IN ('expired', 'rejected', 'archived')) as evidence_count
       FROM "${schema}".controls c
       WHERE c.control_id LIKE $1 OR c.framework_code ILIKE 'iso%27001%'
       ORDER BY c.control_id
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query203(schema: string, args: unknown[]) {
    const query = `SELECT exception_id, reason, approved_by
         FROM "${schema}".control_exceptions
         WHERE control_id = $1 AND status = 'approved'
         LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query204(schema: string, args: unknown[]) {
    const query = evidenceQuery;
    return safeQuery(query, args);
  }

  static async query205(schema: string, args: unknown[]) {
    const query = `SELECT control_id, control_title, status
       FROM "${schema}".controls
       WHERE control_id LIKE $1 OR control_title ILIKE $2
       ORDER BY control_id
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query206(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(NULLIF(source_system_name, ''), 'manual') AS source, COUNT(*)::int AS count
     FROM "${schema}".evidence WHERE deleted_at IS NULL
     GROUP BY source ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query207(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count
     FROM "${schema}".evidence WHERE deleted_at IS NULL
     GROUP BY status ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query208(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id AS entity_id, title, status AS action, 'evidence' AS entity_type,
            submitted_by AS user_id, created_at
     FROM "${schema}".evidence
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query209(schema: string, args: unknown[]) {
    const query = `SELECT id, user_id, module, action, entity_type, entity_id, summary, created_at
     FROM "${schema}".activity_stream
     WHERE module = 'evidence'
     ORDER BY created_at DESC LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query210(schema: string, args: unknown[]) {
    const query = `SELECT
       connector_id,
       MAX(completed_at) AS last_run_at,
       COUNT(*)::int AS total_runs,
       SUM(items_collected)::int AS total_collected,
       COUNT(*) FILTER (WHERE result_status = 'failed')::int AS failure_count,
       (SELECT result_status FROM "${schema}".evidence_collection_runs r2
        WHERE r2.connector_id = cr.connector_id ORDER BY r2.started_at DESC LIMIT 1) AS latest_status
     FROM "${schema}".evidence_collection_runs cr
     GROUP BY connector_id
     ORDER BY last_run_at DESC`;
    return safeQuery(query, args);
  }

  static async query211(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_dashboard_cache (cache_key, payload, computed_at, ttl_seconds)
       VALUES ($1, $2::jsonb, NOW(), $3)
       ON CONFLICT (cache_key) DO UPDATE
         SET payload = EXCLUDED.payload,
             computed_at = NOW(),
             ttl_seconds = EXCLUDED.ttl_seconds`;
    return safeQuery(query, args);
  }

  static async query212(schema: string, args: unknown[]) {
    const query = `SELECT payload, computed_at, ttl_seconds
       FROM "${schema}".evidence_dashboard_cache
       WHERE cache_key = $1
         AND computed_at + (ttl_seconds || ' seconds')::interval > NOW()
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query213(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".evidence_dashboard_cache`;
    return safeQuery(query, args);
  }

  static async query214(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".evidence_dashboard_cache WHERE cache_key = $1`;
    return safeQuery(query, args);
  }

  static async query215(schema: string, args: unknown[]) {
    const query = `SELECT
         id, connector_id, started_at, completed_at,
         result_status, items_failed, error_message
       FROM "${schema}".evidence_collection_runs
       WHERE result_status IN ('failed', 'error')
         AND started_at >= NOW() - INTERVAL '7 days'
       ORDER BY started_at DESC
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query216(schema: string, args: unknown[]) {
    const query = `SELECT
         id, package_code, name, status, item_count, created_at
       FROM "${schema}".evidence_packages
       WHERE created_by = $1
         AND status = 'draft'
       ORDER BY created_at DESC
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query217(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT ON (e.evidence_id)
         e.evidence_id, e.title, e.status, e.evidence_type,
         er.reviewed_at, er.notes AS rejection_notes
       FROM "${schema}".evidence_reviews er
       JOIN "${schema}".evidence e ON e.evidence_id = er.evidence_id
       WHERE er.outcome = 'rejected'
         AND e.submitted_by = $1
         AND e.status NOT IN ('approved', 'active', 'deleted', 'archived')
       ORDER BY e.evidence_id, er.reviewed_at DESC NULLS LAST
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query218(schema: string, args: unknown[]) {
    const query = `SELECT
         evidence_id, title, valid_to, status, evidence_type,
         EXTRACT(EPOCH FROM (valid_to - NOW())) / 86400 AS days_until_expiry
       FROM "${schema}".evidence
       WHERE owner_user_id = $1
         AND valid_to IS NOT NULL
         AND valid_to >= NOW()
         AND valid_to < NOW() + INTERVAL '30 days'
         AND status NOT IN ('deleted', 'archived', 'expired')
       ORDER BY valid_to ASC
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query219(schema: string, args: unknown[]) {
    const query = `SELECT
         er.review_id, er.evidence_id, e.title AS evidence_title,
         e.evidence_type, er.created_at,
         EXTRACT(EPOCH FROM (NOW() - er.created_at)) / 86400 AS wait_days
       FROM "${schema}".evidence_reviews er
       JOIN "${schema}".evidence e ON e.evidence_id = er.evidence_id
       WHERE er.reviewer_id = $1
         AND er.outcome IS NULL
         AND er.reviewed_at IS NULL
       ORDER BY er.created_at ASC
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query220(schema: string, args: unknown[]) {
    const query = `SELECT
         id, request_code, status, priority, due_date, created_at,
         CASE WHEN due_date IS NOT NULL AND due_date < NOW() THEN true ELSE false END AS is_overdue
       FROM "${schema}".evidence_requests
       WHERE requested_from_user_id = $1
         AND status IN ('open', 'pending', 'overdue')
       ORDER BY
         CASE WHEN due_date IS NOT NULL AND due_date < NOW() THEN 0 ELSE 1 END,
         due_date ASC NULLS LAST
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query221(schema: string, args: unknown[]) {
    const query = `SELECT
         COALESCE(quality_tier, 'C') AS tier,
         COUNT(*)::int AS count
       FROM "${schema}".evidence_quality_assessments
       GROUP BY COALESCE(quality_tier, 'C')
       ORDER BY tier`;
    return safeQuery(query, args);
  }

  static async query222(schema: string, args: unknown[]) {
    const query = `SELECT
         COALESCE(NULLIF(TRIM(source_type), ''), COALESCE(NULLIF(TRIM(source_system_name), ''), 'manual_upload')) AS source_type,
         COUNT(*)::int AS count
       FROM "${schema}".evidence
       WHERE status != 'deleted'
       GROUP BY COALESCE(NULLIF(TRIM(source_type), ''), COALESCE(NULLIF(TRIM(source_system_name), ''), 'manual_upload'))
       ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query223(schema: string, args: unknown[]) {
    const query = `SELECT
         COALESCE(status, 'unknown') AS status,
         COUNT(*)::int AS count
       FROM "${schema}".evidence
       WHERE status != 'deleted'
       GROUP BY COALESCE(status, 'unknown')
       ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query224(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(AVG(COALESCE(composite_score, quality_score)), 0)::numeric(5,2) AS avg_score
       FROM "${schema}".evidence_quality_assessments`;
    return safeQuery(query, args);
  }

  static async query225(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS overdue
       FROM "${schema}".evidence_requests
       WHERE (status = 'overdue' OR (status IN ('open', 'pending') AND due_date IS NOT NULL AND due_date < NOW()))
         AND status NOT IN ('completed', 'cancelled', 'fulfilled')`;
    return safeQuery(query, args);
  }

  static async query226(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS pending
       FROM "${schema}".evidence_reviews
       WHERE outcome IS NULL AND reviewed_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query227(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('active', 'approved', 'submitted', 'under_review'))::int AS active,
         COUNT(*) FILTER (
           WHERE valid_to IS NOT NULL
             AND valid_to >= NOW()
             AND valid_to < NOW() + INTERVAL '30 days'
             AND status NOT IN ('deleted', 'archived', 'expired')
         )::int AS expiring_soon,
         COUNT(*) FILTER (
           WHERE status = 'expired'
             OR (valid_to IS NOT NULL AND valid_to < NOW() AND status NOT IN ('deleted', 'archived'))
         )::int AS expired,
         COUNT(*) FILTER (
           WHERE COALESCE(source_type, source_system_name, '') IN ('connector_pull', 'pipeline', 'automated', 'connector', 'api', 'integration')
         )::int AS connector_pull,
         COUNT(*) FILTER (
           WHERE COALESCE(source_type, source_system_name, '') IN ('', 'manual_upload', 'manual', 'user')
             OR (source_type IS NULL AND source_system_name IS NULL)
         )::int AS manual_upload,
         COUNT(*) FILTER (
           WHERE freshness_status = 'current'
             OR (freshness_status IS NULL AND (valid_to IS NULL OR valid_to > NOW() + INTERVAL '90 days'))
         )::int AS fresh,
         COUNT(*) FILTER (WHERE reusable_flag = true)::int AS reusable
       FROM "${schema}".evidence
       WHERE status != 'deleted'`;
    return safeQuery(query, args);
  }

  static async query228(schema: string, args: unknown[]) {
    const query = `SELECT ee.*,
            eem.checksum      AS manifest_checksum,
            eem.generated_at  AS manifest_generated_at
     FROM "${schema}".evidence_exports ee
     LEFT JOIN "${schema}".evidence_export_manifests eem ON eem.export_id = ee.id
     WHERE ee.package_id = $1
     ORDER BY ee.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query229(schema: string, args: unknown[]) {
    const query = `SELECT id, status FROM "${schema}".evidence_packages WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query230(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_packages
     SET ${setClauses.join(', ')}
     WHERE id = $${idx}
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query231(schema: string, args: unknown[]) {
    const query = `SELECT id, status FROM "${schema}".evidence_packages WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query232(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_packages
       (id, name, description, package_type, framework_code, scope_start, scope_end,
        status, item_count, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', 0, $8, NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query233(schema: string, args: unknown[]) {
    const query = `SELECT epi.id          AS item_id,
            epi.evidence_id,
            epi.notes,
            epi.added_by,
            epi.added_at,
            epi.sort_order,
            e.title         AS evidence_title,
            e.evidence_type AS evidence_type,
            e.freshness_status,
            e.status        AS evidence_status,
            e.valid_from,
            e.valid_to
     FROM "${schema}".evidence_package_items epi
     LEFT JOIN "${schema}".evidence e ON e.evidence_id = epi.evidence_id
     WHERE epi.package_id = $1
     ORDER BY epi.sort_order ASC, epi.added_at ASC`;
    return safeQuery(query, args);
  }

  static async query234(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_packages WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query235(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_packages ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`;
    return safeQuery(query, args);
  }

  static async query236(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".evidence_packages ${where}`;
    return safeQuery(query, args);
  }

  static async query237(schema: string, args: unknown[]) {
    const query = `SELECT
       c.framework_code,
       COUNT(DISTINCT c.control_id)::int AS total_controls,
       COUNT(DISTINCT e.control_id)::int AS controls_with_evidence,
       COUNT(DISTINCT CASE WHEN e.freshness_status IN ('stale', 'expired') THEN e.evidence_id END)::int AS stale_count
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".evidence e ON e.control_id = c.control_id
       AND e.status NOT IN ('deleted', 'archived', 'disposed')
       AND e.deleted_at IS NULL
     WHERE c.framework_code IS NOT NULL
     GROUP BY c.framework_code
     ORDER BY c.framework_code`;
    return safeQuery(query, args);
  }

  static async query238(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, evidence_type, control_id, framework_code,
            owner_user_id, freshness_status, valid_to, created_at, updated_at
     FROM "${schema}".evidence
     WHERE (freshness_status IN ('stale', 'expired') OR (valid_to IS NOT NULL AND valid_to < NOW()))
       AND status NOT IN ('deleted', 'archived', 'disposed')
       AND deleted_at IS NULL
     ORDER BY valid_to ASC NULLS LAST
     LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query239(schema: string, args: unknown[]) {
    const query = `SELECT reviewer_id, COUNT(*)::int AS count
     FROM "${schema}".evidence_reviews
     WHERE outcome IS NULL AND reviewed_at IS NULL AND deleted_at IS NULL
     GROUP BY reviewer_id
     ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query240(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.title, e.status, e.submitted_by, e.created_at,
            EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 86400 AS wait_days
     FROM "${schema}".evidence e
     WHERE e.status IN ('submitted', 'validating', 'under_review')
       AND e.deleted_at IS NULL
     ORDER BY e.created_at ASC
     LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query241(schema: string, args: unknown[]) {
    const query = `SELECT id, request_code, requested_from_user_id, priority, due_date, status, created_at,
            EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400 AS overdue_days
     FROM "${schema}".evidence_requests
     WHERE (status = 'overdue' OR (status IN ('open', 'pending') AND due_date IS NOT NULL AND due_date < NOW()))
     ORDER BY due_date ASC
     LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query242(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS orphan_count
       FROM "${schema}".evidence e
       LEFT JOIN "${schema}".evidence_links el ON el.evidence_id = e.evidence_id
       WHERE e.status NOT IN ('deleted', 'archived', 'expired')
         AND e.control_id IS NULL
         AND el.evidence_id IS NULL`;
    return safeQuery(query, args);
  }

  static async query243(schema: string, args: unknown[]) {
    const query = `SELECT
         e.evidence_id,
         e.title,
         COUNT(el.id)::int AS link_count
       FROM "${schema}".evidence e
       JOIN "${schema}".evidence_links el ON el.evidence_id = e.evidence_id
       WHERE e.status NOT IN ('deleted', 'archived', 'expired')
       GROUP BY e.evidence_id, e.title
       ORDER BY link_count DESC
       LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query244(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT el.evidence_id)::int AS actually_reused
       FROM "${schema}".evidence_links el
       JOIN "${schema}".evidence e ON e.evidence_id = el.evidence_id
       WHERE e.status NOT IN ('deleted', 'archived', 'expired')
       GROUP BY el.evidence_id
       HAVING COUNT(*) >= 2`;
    return safeQuery(query, args);
  }

  static async query245(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total_reusable
       FROM "${schema}".evidence
       WHERE reusable_flag = true
         AND status NOT IN ('deleted', 'archived', 'expired')`;
    return safeQuery(query, args);
  }

  static async query246(schema: string, args: unknown[]) {
    const query = `SELECT
           COALESCE(AVG(CASE WHEN completeness_result NOT IN ('not_assessed','') THEN quality_score ELSE NULL END), 0)::numeric(5,2) AS completeness,
           COALESCE(AVG(CASE WHEN scope_match_result NOT IN ('not_assessed','') THEN quality_score ELSE NULL END), 0)::numeric(5,2) AS scope_match,
           COALESCE(AVG(CASE WHEN authenticity_result NOT IN ('not_assessed','') THEN quality_score ELSE NULL END), 0)::numeric(5,2) AS authenticity,
           COALESCE(AVG(CASE WHEN readability_result NOT IN ('not_assessed','') THEN quality_score ELSE NULL END), 0)::numeric(5,2) AS readability
         FROM "${schema}".evidence_quality_assessments`;
    return safeQuery(query, args);
  }

  static async query247(schema: string, args: unknown[]) {
    const query = `SELECT
         COALESCE(AVG((dimension_scores->>'freshness')::numeric), 0)::numeric(5,2) AS freshness,
         COALESCE(AVG((dimension_scores->>'completeness')::numeric), 0)::numeric(5,2) AS completeness,
         COALESCE(AVG((dimension_scores->>'sourceReliability')::numeric), 0)::numeric(5,2) AS source_reliability,
         COALESCE(AVG((dimension_scores->>'reviewerSignOff')::numeric), 0)::numeric(5,2) AS reviewer_signoff,
         COALESCE(AVG((dimension_scores->>'formatMatch')::numeric), 0)::numeric(5,2) AS format_match
       FROM "${schema}".evidence_quality_assessments
       WHERE dimension_scores IS NOT NULL AND dimension_scores != '{}'::jsonb`;
    return safeQuery(query, args);
  }

  static async query248(schema: string, args: unknown[]) {
    const query = `SELECT
         TO_CHAR(assessed_at, 'YYYY-MM') AS month,
         COALESCE(AVG(COALESCE(composite_score, quality_score)), 0)::numeric(5,2) AS avg_score,
         COUNT(*)::int AS assessment_count
       FROM "${schema}".evidence_quality_assessments
       WHERE assessed_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(assessed_at, 'YYYY-MM')
       ORDER BY month ASC`;
    return safeQuery(query, args);
  }

  static async query249(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(AVG(COALESCE(composite_score, quality_score)), 0)::numeric(5,2) AS avg_score
       FROM "${schema}".evidence_quality_assessments`;
    return safeQuery(query, args);
  }

  static async query250(schema: string, args: unknown[]) {
    const query = `SELECT
         COALESCE(quality_tier, 'C') AS tier,
         COUNT(*)::int AS count
       FROM "${schema}".evidence_quality_assessments
       GROUP BY COALESCE(quality_tier, 'C')
       ORDER BY tier`;
    return safeQuery(query, args);
  }

  static async query251(schema: string, args: unknown[]) {
    const query = `SELECT
         COALESCE(framework_code, 'unlinked') AS framework_code,
         COUNT(*) FILTER (
           WHERE freshness_status = 'current'
             OR (freshness_status IS NULL AND (valid_to IS NULL OR valid_to > NOW() + INTERVAL '90 days'))
         )::int AS fresh,
         COUNT(*) FILTER (
           WHERE freshness_status = 'aging'
             OR (freshness_status IS NULL AND valid_to IS NOT NULL
                 AND valid_to > NOW() + INTERVAL '30 days'
                 AND valid_to <= NOW() + INTERVAL '90 days')
         )::int AS aging,
         COUNT(*) FILTER (
           WHERE freshness_status = 'stale'
             OR (freshness_status IS NULL AND valid_to IS NOT NULL
                 AND valid_to > NOW()
                 AND valid_to <= NOW() + INTERVAL '30 days')
         )::int AS stale,
         COUNT(*) FILTER (
           WHERE freshness_status = 'expired'
             OR status = 'expired'
             OR (freshness_status IS NULL AND valid_to IS NOT NULL AND valid_to <= NOW())
         )::int AS expired
       FROM "${schema}".evidence
       WHERE status NOT IN ('deleted', 'archived')
       GROUP BY COALESCE(framework_code, 'unlinked')
       ORDER BY framework_code`;
    return safeQuery(query, args);
  }

  static async query252(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) FILTER (
         WHERE freshness_status = 'current'
           OR (freshness_status IS NULL AND (valid_to IS NULL OR valid_to > NOW() + INTERVAL '90 days'))
       )::int AS fresh,
       COUNT(*) FILTER (
         WHERE freshness_status = 'aging'
           OR (freshness_status IS NULL AND valid_to IS NOT NULL
               AND valid_to > NOW() + INTERVAL '30 days'
               AND valid_to <= NOW() + INTERVAL '90 days')
       )::int AS aging,
       COUNT(*) FILTER (
         WHERE freshness_status = 'stale'
           OR (freshness_status IS NULL AND valid_to IS NOT NULL
               AND valid_to > NOW()
               AND valid_to <= NOW() + INTERVAL '30 days')
       )::int AS stale,
       COUNT(*) FILTER (
         WHERE freshness_status = 'expired'
           OR status = 'expired'
           OR (freshness_status IS NULL AND valid_to IS NOT NULL AND valid_to <= NOW())
       )::int AS expired,
       COUNT(*)::int AS total
     FROM "${schema}".evidence
     WHERE status NOT IN ('deleted', 'archived')`;
    return safeQuery(query, args);
  }

  static async query253(schema: string, args: unknown[]) {
    const query = `SELECT
       COALESCE(NULLIF(TRIM(e.source_type), ''), COALESCE(NULLIF(TRIM(e.source_system_name), ''), 'manual_upload')) AS source_type,
       COUNT(*)::int AS count,
       COALESCE(AVG(qa.quality_score), 0)::numeric(5,2) AS avg_quality_score
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_quality_assessments qa ON qa.evidence_id = e.evidence_id
     WHERE e.status != 'deleted'
     GROUP BY COALESCE(NULLIF(TRIM(e.source_type), ''), COALESCE(NULLIF(TRIM(e.source_system_name), ''), 'manual_upload'))
     ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query254(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total
     FROM "${schema}".evidence
     WHERE status != 'deleted'`;
    return safeQuery(query, args);
  }

  static async query255(schema: string, args: unknown[]) {
    const query = `SELECT
         id,
         request_code,
         status,
         priority,
         due_date,
         requested_from_user_id,
         created_at,
         EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS age_days
       FROM "${schema}".evidence_requests
       WHERE status IN ('open', 'pending', 'overdue')
       ORDER BY created_at ASC
       LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query256(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS expiring_count
       FROM "${schema}".evidence
       WHERE valid_to IS NOT NULL
         AND valid_to >= NOW()
         AND valid_to < NOW() + INTERVAL '30 days'
         AND status NOT IN ('deleted', 'archived', 'expired')`;
    return safeQuery(query, args);
  }

  static async query257(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT e.evidence_id)::int AS rejected_count
       FROM "${schema}".evidence_reviews er
       JOIN "${schema}".evidence e ON e.evidence_id = er.evidence_id
       WHERE er.outcome = 'rejected'
         AND e.status NOT IN ('approved', 'active', 'deleted', 'archived')`;
    return safeQuery(query, args);
  }

  static async query258(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS pending
       FROM "${schema}".evidence_reviews
       WHERE outcome IS NULL AND reviewed_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query259(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) FILTER (WHERE status IN ('open', 'pending'))::int AS open_count,
         COUNT(*) FILTER (
           WHERE status = 'overdue'
             OR (status IN ('open', 'pending') AND due_date IS NOT NULL AND due_date < NOW())
         )::int AS overdue_count
       FROM "${schema}".evidence_requests`;
    return safeQuery(query, args);
  }

  static async query260(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 BETWEEN 0 AND 30
       )::int AS band_0_30,
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 BETWEEN 31 AND 60
       )::int AS band_31_60,
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 BETWEEN 61 AND 90
       )::int AS band_61_90,
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 BETWEEN 91 AND 180
       )::int AS band_91_180,
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 BETWEEN 181 AND 365
       )::int AS band_181_365,
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 > 365
       )::int AS band_365_plus,
       COUNT(*)::int AS total,
       COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400), 0) AS avg_age_days,
       MIN(created_at) AS oldest_date
     FROM "${schema}".evidence
     WHERE ${whereClause}`;
    return safeQuery(query, args);
  }

  static async query261(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.title, e.evidence_type, e.status, e.framework_code,
            e.control_id, e.created_at,
            COUNT(el.id) AS link_count
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_links el ON el.evidence_id = e.evidence_id
     WHERE e.reusable_flag = true
       AND e.status NOT IN ('expired', 'rejected', 'archived', 'deleted', 'disposed')
       AND e.deleted_at IS NULL
     GROUP BY e.evidence_id, e.title, e.evidence_type, e.status, e.framework_code, e.control_id, e.created_at
     ORDER BY link_count DESC, e.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query262(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_duplicate_candidates
     SET resolved = true, resolution = $1, resolved_by = $2, resolved_at = NOW()
     WHERE id = $3 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query263(schema: string, args: unknown[]) {
    const query = `SELECT dc.id, dc.evidence_a_id, dc.evidence_b_id, dc.similarity_score,
            dc.detection_method, dc.detected_at,
            ea.title AS title_a, eb.title AS title_b,
            ea.evidence_type AS type_a, eb.evidence_type AS type_b
     FROM "${schema}".evidence_duplicate_candidates dc
     JOIN "${schema}".evidence ea ON ea.evidence_id = dc.evidence_a_id
     JOIN "${schema}".evidence eb ON eb.evidence_id = dc.evidence_b_id
     WHERE dc.resolved = false
     ORDER BY dc.similarity_score DESC, dc.detected_at DESC`;
    return safeQuery(query, args);
  }

  static async query264(schema: string, args: unknown[]) {
    const query = `SELECT id, evidence_id, linked_object_type, linked_object_id, link_type, notes, created_by, created_at
     FROM "${schema}".evidence_links
     WHERE evidence_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query265(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".evidence_links WHERE id = $1 AND evidence_id = $2`;
    return safeQuery(query, args);
  }

  static async query266(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_links (evidence_id, linked_object_type, linked_object_id, link_type, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query267(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id FROM "${schema}".evidence WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query268(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence SET reusable_flag = false, updated_at = NOW() WHERE evidence_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query269(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence SET reusable_flag = true, updated_at = NOW() WHERE evidence_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query270(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id FROM "${schema}".evidence WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query271(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.title, e.evidence_type, e.status, e.created_at, e.owner_user_id
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_links el ON el.evidence_id = e.evidence_id
     WHERE e.status NOT IN ('expired', 'rejected', 'archived', 'deleted', 'disposed')
       AND e.deleted_at IS NULL
       AND e.control_id IS NULL
       AND el.id IS NULL
     ORDER BY e.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query272(schema: string, args: unknown[]) {
    const query = query;
    return safeQuery(query, args);
  }

  static async query273(schema: string, args: unknown[]) {
    const query = query;
    return safeQuery(query, args);
  }

  static async query274(schema: string, args: unknown[]) {
    const query = `CREATE EXTENSION IF NOT EXISTS pg_trgm`;
    return safeQuery(query, args);
  }

  static async query275(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'`;
    return safeQuery(query, args);
  }

  static async query276(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.title, e.control_id, e.framework_code
       FROM "${schema}".evidence e
       WHERE e.evidence_type = $1
         AND e.control_id != $2
         AND e.status IN ('approved', 'active', 'submitted')
       ORDER BY e.created_at DESC
       LIMIT 3`;
    return safeQuery(query, args);
  }

  static async query277(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT evidence_type FROM "${schema}".evidence
     WHERE control_id = $1 AND status NOT IN ('expired', 'rejected', 'archived')`;
    return safeQuery(query, args);
  }

  static async query278(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT evidence_type_code
     FROM "${schema}".control_evidence_requirements
     WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query279(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = 'control_evidence_requirements'`;
    return safeQuery(query, args);
  }

  static async query280(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.title, e.evidence_type, e.control_id, e.framework_code,
            c.framework_code AS control_framework
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
     WHERE e.status NOT IN ('expired', 'rejected', 'archived')
     ORDER BY e.evidence_type, e.created_at DESC
     LIMIT 1000`;
    return safeQuery(query, args);
  }

  static async query281(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.control_id, e.title, e.expiry_date,
              c.title AS control_title
       FROM "${schema}".evidence e
       LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
       WHERE e.expiry_date IS NOT NULL
         AND e.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '14 days'
         AND e.status NOT IN ('expired', 'superseded')`;
    return safeQuery(query, args);
  }

  static async query282(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_schedules SET last_reminded_at = NOW() WHERE schedule_id = $1`;
    return safeQuery(query, args);
  }

  static async query283(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_requests
           (control_id, requesting_team_id, due_date, status, evidence_type, description, department_id, business_unit_id)
         VALUES ($1, $2, $3, 'pending', 'scheduled', $4, $5, $6)
         ON CONFLICT (control_id, requesting_team_id) DO UPDATE SET
           due_date = EXCLUDED.due_date, status = EXCLUDED.status, evidence_type = EXCLUDED.evidence_type, description = EXCLUDED.description
         WHERE (evidence_requests.due_date, evidence_requests.status) IS DISTINCT FROM (EXCLUDED.due_date, EXCLUDED.status)`;
    return safeQuery(query, args);
  }

  static async query284(schema: string, args: unknown[]) {
    const query = `SELECT es.schedule_id,
            es.control_id,
            ${cronCol} AS cron_expression,
            ${lastCol} AS last_reminded_at,
            ${ctrlTitleExpr} AS control_title
     ,c.department_id, c.business_unit_id
     FROM "${schema}".evidence_schedules es
     LEFT JOIN "${schema}".controls c ON c.control_id = es.control_id
     WHERE ${enabledCol}
       AND (
         ${lastCol} IS NULL
         OR (${cronCol} LIKE '0 * * * *'   AND ${lastCol} < NOW() - INTERVAL '1 day')
         OR (${cronCol} LIKE '0 0 * * 1'   AND ${lastCol} < NOW() - INTERVAL '7 days')
         OR (${cronCol} LIKE '0 0 1 * *'   AND ${lastCol} < NOW() - INTERVAL '30 days')
         OR (${cronCol} LIKE '0 0 1 */3 *' AND ${lastCol} < NOW() - INTERVAL '90 days')
         OR (${cronCol} LIKE '0 0 1 1 *'   AND ${lastCol} < NOW() - INTERVAL '365 days')
         OR (${lastCol} < NOW() - INTERVAL '30 days')
       )`;
    return safeQuery(query, args);
  }

  static async query285(schema: string, args: unknown[]) {
    const query = `SELECT team_id FROM "${schema}".teams WHERE team_code = 'AUDIT' AND ${schedCols.has('active') ? 'active = true' : 'TRUE'} LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query286(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'evidence_schedules'`;
    return safeQuery(query, args);
  }

  static async query287(schema: string, args: unknown[]) {
    const query = `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'controls'`;
    return safeQuery(query, args);
  }

  static async query288(schema: string, args: unknown[]) {
    const query = `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'evidence_schedules'`;
    return safeQuery(query, args);
  }

  static async query289(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_requests SET ${sets.join(', ')} WHERE request_id = $${idx} RETURNING *`;
    return safeQuery(query, args);
  }

  static async query290(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_requests WHERE request_id = $1`;
    return safeQuery(query, args);
  }

  static async query291(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_requests
       (control_id, framework_code, evidence_type, assigned_team_id, request_details,
        due_date, priority, status, created_by, department_id, business_unit_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query292(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query293(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE outcome = 'accepted') AS accepted,
       COUNT(*) FILTER (WHERE outcome = 'rejected') AS rejected,
       COUNT(*) FILTER (WHERE outcome = 'needs_revision') AS needs_revision,
       AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 86400) AS avg_days
     FROM "${schema}".evidence_reviews
     WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query294(schema: string, args: unknown[]) {
    const query = `SELECT id, evidence_id, review_id, completeness_result, scope_match_result,
            authenticity_result, readability_result, quality_score, notes, assessed_by, assessed_at
     FROM "${schema}".evidence_quality_assessments
     WHERE evidence_id = $1
     ORDER BY assessed_at DESC`;
    return safeQuery(query, args);
  }

  static async query295(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_reviews (evidence_id, reviewer_id, review_type, outcome, comments)
     VALUES ($1, $2, 'information_request', 'needs_revision', $3) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query296(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query297(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence SET quality_status = $1, updated_at = NOW() WHERE evidence_id = $2`;
    return safeQuery(query, args);
  }

  static async query298(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_quality_assessments
       (evidence_id, review_id, completeness_result, scope_match_result, authenticity_result,
        readability_result, quality_score, notes, assessed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query299(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_reviews (evidence_id, reviewer_id, review_type, outcome, comments)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query300(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, status FROM "${schema}".evidence WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query301(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query302(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query303(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".controls SET evidence_ids = $1 WHERE control_id = $2`;
    return safeQuery(query, args);
  }

  static async query304(schema: string, args: unknown[]) {
    const query = `SELECT evidence_ids FROM "${schema}".controls WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query305(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_status_log (evidence_id, from_status, to_status, changed_by)
       VALUES ($1, NULL, 'submitted', $2)`;
    return safeQuery(query, args);
  }

  static async query306(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence
      (control_id, title, description, file_path, content_hash, previous_hash, chain_position,
       submitted_by, expiry_date, owner_user_id, created_by, org_unit_id, status,
       department_id, business_unit_id, location_id, owner_role_id, risk_id, framework_code,
       source_type, source_reference, metadata_kv)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$8,$8,$10,'submitted',
             $11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query307(schema: string, args: unknown[]) {
    const query = `SELECT content_hash, chain_position FROM "${schema}".evidence
     ORDER BY chain_position DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query308(schema: string, args: unknown[]) {
    const query = `SELECT retention_days FROM "${schema}".evidence_catalog
     WHERE control_id = $1 ORDER BY retention_days ASC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query309(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id FROM "${schema}".evidence
     WHERE control_id = $1 AND title = $2 AND content_hash IS NOT NULL
     ORDER BY created_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query310(schema: string, args: unknown[]) {
    const query = `SELECT requires_attestation, attestation_role
     FROM "${schema}".control_evidence_requirements
     WHERE control_id::text = $1 AND requires_attestation = true
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query311(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".evidence_catalog WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query312(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence
     WHERE expiry_date IS NOT NULL
       AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
       AND expiry_date >= CURRENT_DATE
     ORDER BY expiry_date ASC`;
    return safeQuery(query, args);
  }

  static async query313(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence
      (control_id, title, description, file_path, content_hash, previous_hash, chain_position,
       submitted_by, version, previous_version_id, expiry_date, file_size_bytes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query314(schema: string, args: unknown[]) {
    const query = `SELECT content_hash, chain_position FROM "${schema}".evidence
     ORDER BY chain_position DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query315(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query316(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".evidence_items WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query317(schema: string, args: unknown[]) {
    const query = `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query318(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`;
    return safeQuery(query, args);
  }

  static async query319(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query320(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_items SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

}
