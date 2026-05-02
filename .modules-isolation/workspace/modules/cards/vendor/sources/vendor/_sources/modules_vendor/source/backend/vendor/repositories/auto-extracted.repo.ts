// @ts-nocheck
// Auto-extracted Vendor repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class VendorAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".vendors WHERE status = 'expired' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".vendors WHERE status = 'high_risk' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".vendors WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'vendor' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'vendor','transition',$3,$4,$5,$6)`;
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
    const query = `SELECT event_id, event_type, entity_type, entity_id, payload, created_at
         FROM "${schema}".agrc_event_log
         WHERE event_type IN (
           'consultant.finding_added',
           'vendor.questionnaire_responded',
           'vendor.engagement_score_low',
           'risk.changed',
           'engagement.cycle_completed'
         )
         ORDER BY created_at DESC
         LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT total_score FROM "${schema}".vendor_engagement_scores
         ORDER BY computed_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(AVG(risk_score), 0) AS avg
         FROM "${schema}".risks WHERE status = 'open'`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(AVG(effectiveness), 0) AS avg
         FROM "${schema}".controls WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM "${schema}".users
       WHERE role = 'compliance_officer' LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".findings
       (consultant_id, client_tenant_id, title, description, severity, framework_ref, recommendation, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".findings
     WHERE consultant_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".findings
         WHERE severity = 'critical' AND status = 'open'`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `SELECT total_score FROM "${schema}".vendor_engagement_scores
         ORDER BY computed_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(MAX(risk_score), 0) AS max_risk
         FROM "${schema}".risks WHERE status = 'open'`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(AVG(effectiveness), 0) AS avg_score
         FROM "${schema}".controls WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT name FROM public.tenants WHERE tenant_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT tenant_id FROM public.consultant_assignments
     WHERE consultant_id = $1`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM public.consultant_assignments
     WHERE consultant_id = $1 AND tenant_id = $2
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".regulator_requests
     WHERE request_id = $1`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT framework_id, name, version,
            (SELECT COUNT(*) FROM "${schema}".controls c WHERE c.framework_id = f.framework_id) AS control_count,
            COALESCE(coverage_percent, 0) AS coverage_percent
     FROM "${schema}".frameworks f
     ORDER BY name ASC`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT entry_id, action, user_id AS actor, entity_type || ': ' || entity_id AS details, timestamp
     FROM "${schema}".audit_trail
     ORDER BY timestamp DESC
     LIMIT 500`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".regulator_requests
     WHERE regulator_user_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".regulator_requests
       (regulator_user_id, request_type, subject, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, type, status, linked_control, uploaded_at, file_url
     FROM "${schema}".evidence
     WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, type, status, linked_control, uploaded_at, file_url
     FROM "${schema}".evidence ${where}
     ORDER BY uploaded_at DESC`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT risk_level, COUNT(*) AS cnt
     FROM "${schema}".risks
     GROUP BY risk_level`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT AVG(effectiveness_score) AS avg_effectiveness
     FROM "${schema}".controls
     WHERE effectiveness_score IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT framework_name, coverage_percent
     FROM "${schema}".framework_coverage`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT tenant_name, compliance_score, status
         FROM "${schema}".tenant_info
         LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT config_value FROM "${schema}".tenant_config
       WHERE config_key = 'regulator_field_masking'
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `SELECT tenant_id FROM public.regulator_assignments
     WHERE regulator_id = $1`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT assignment_id FROM public.regulator_assignments
     WHERE regulator_id = $1 AND tenant_id::text = $2
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT config_value FROM "${schema}".vendor_admin_config WHERE config_key = 'dd_workflow_default'`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_admin_config
     SET config_value = COALESCE(config_value, '[]'::jsonb) || $1::jsonb,
         updated_by = $2, updated_at = NOW()
     WHERE config_key = 'assessment_templates'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT config_value FROM "${schema}".vendor_admin_config WHERE config_key = 'assessment_templates'`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_admin_config (config_key, config_value, updated_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (config_key) DO UPDATE
       SET config_value = $2, updated_by = $3, updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendor_admin_config ORDER BY config_key`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendor_admin_config WHERE config_key = $1`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT v.vendor_id, v.risk_score, v.contract_value,
       (SELECT COUNT(*) FROM "${schema}".vendor_fourth_party_risk fp WHERE fp.vendor_id = v.vendor_id AND fp.is_active = TRUE AND fp.deleted_at IS NULL) AS fp_count,
       (SELECT COUNT(*) FROM "${schema}".vendor_sla_breach_log b WHERE b.vendor_id = v.vendor_id AND b.remediation_status NOT IN ('resolved','accepted')) AS open_breaches
     FROM "${schema}".vendors v WHERE v.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_monitoring_signals (vendor_id, signal_type, severity, title, description, source, source_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_offboarding_checklist
     SET status = $1, completed_by = $2, notes = COALESCE($3, notes), completed_at = ${completedAt}, updated_at = NOW()
     WHERE checklist_id = $4 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendor_offboarding_checklist WHERE offboarding_id = $1 ORDER BY step_number`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT link_id FROM "${schema}".entity_links
       WHERE ((source_type = 'vendor' AND source_id = $1 AND target_type = 'vendor' AND target_id = $2)
          OR (source_type = 'vendor' AND source_id = $2 AND target_type = 'vendor' AND target_id = $1))
         AND relationship_type = 'related_to'
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `SELECT 
       fp1.vendor_id AS vendor1_id,
       fp2.vendor_id AS vendor2_id,
       COALESCE(fp1.sub_vendor_id::text, fp1.sub_vendor_name) AS shared_sub_vendor_key,
       fp1.sub_vendor_name
     FROM "${schema}".vendor_fourth_party_risk fp1
     JOIN "${schema}".vendor_fourth_party_risk fp2
       ON fp1.vendor_id < fp2.vendor_id
       AND (
         (fp1.sub_vendor_id IS NOT NULL AND fp2.sub_vendor_id IS NOT NULL AND fp1.sub_vendor_id = fp2.sub_vendor_id)
         OR (fp1.sub_vendor_id IS NULL AND fp2.sub_vendor_id IS NULL AND fp1.sub_vendor_name = fp2.sub_vendor_name)
       )
     WHERE fp1.deleted_at IS NULL AND fp1.is_active = TRUE
       AND fp2.deleted_at IS NULL AND fp2.is_active = TRUE
     GROUP BY fp1.vendor_id, fp2.vendor_id, COALESCE(fp1.sub_vendor_id::text, fp1.sub_vendor_name), fp1.sub_vendor_name`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_concentration_analysis
       (analysis_date, dimension, dimension_value, vendor_count, risk_level, concentration_score, affected_vendors)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT v.vendor_id, v.name FROM "${schema}".vendors v
       JOIN "${schema}".vendor_fourth_party_risk fp ON fp.vendor_id = v.vendor_id
       WHERE fp.data_access_level = $1 AND v.deleted_at IS NULL AND fp.deleted_at IS NULL AND fp.is_active = TRUE
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT vendor_id)::int FROM "${schema}".vendor_fourth_party_risk
       WHERE deleted_at IS NULL AND is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT data_access_level, COUNT(DISTINCT vendor_id)::int AS vendor_count
     FROM "${schema}".vendor_fourth_party_risk
     WHERE deleted_at IS NULL AND is_active = TRUE
       AND data_access_level IN ('full', 'sensitive')
     GROUP BY data_access_level
     HAVING COUNT(DISTINCT vendor_id) >= 2`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_concentration_analysis
       (analysis_date, dimension, dimension_value, vendor_count, risk_level, concentration_score, affected_vendors)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT v.vendor_id, v.name FROM "${schema}".vendors v
       JOIN "${schema}".vendor_fourth_party_risk fp ON fp.vendor_id = v.vendor_id
       WHERE fp.geographic_location = $1 AND v.deleted_at IS NULL AND fp.deleted_at IS NULL AND fp.is_active = TRUE
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT vendor_id)::int FROM "${schema}".vendor_fourth_party_risk
       WHERE deleted_at IS NULL AND is_active = TRUE AND geographic_location IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT geographic_location, COUNT(DISTINCT vendor_id)::int AS vendor_count
     FROM "${schema}".vendor_fourth_party_risk
     WHERE deleted_at IS NULL AND is_active = TRUE AND geographic_location IS NOT NULL
     GROUP BY geographic_location
     HAVING COUNT(DISTINCT vendor_id) >= 3`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_concentration_analysis
       (analysis_date, dimension, dimension_value, vendor_count, total_spend, spend_pct, risk_level, concentration_score, affected_vendors)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, name FROM "${schema}".vendors WHERE category = $1 AND deleted_at IS NULL AND status = 'active' LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int FROM "${schema}".vendors WHERE deleted_at IS NULL AND status = 'active'`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT category, COUNT(*)::int AS vendor_count,
       SUM(COALESCE(contract_value, 0))::numeric AS total_spend
     FROM "${schema}".vendors
     WHERE deleted_at IS NULL AND status = 'active'
     GROUP BY category
     HAVING COUNT(*) >= 3 OR SUM(COALESCE(contract_value, 0)) > 0`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".vendor_concentration_analysis WHERE analysis_date = $1`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendor_sla_definitions WHERE sla_def_id = $1`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `SELECT risk_tier, data_access_level, COUNT(*) AS cnt
     FROM "${schema}".vendor_fourth_party_risk
     WHERE vendor_id = $1 AND is_active = TRUE AND deleted_at IS NULL GROUP BY risk_tier, data_access_level`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendor_fourth_party_risk WHERE vendor_id = $1 AND deleted_at IS NULL AND is_active = TRUE ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `SELECT link_id FROM "${schema}".entity_links
         WHERE ((source_type = 'vendor' AND source_id = $1 AND target_type = 'vendor' AND target_id = $2)
            OR (source_type = 'vendor' AND source_id = $2 AND target_type = 'vendor' AND target_id = $1))
           AND relationship_type = 'related_to'
         LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT vendor_id FROM "${schema}".vendor_fourth_party_risk
       WHERE sub_vendor_id = $1 AND vendor_id != $2 AND deleted_at IS NULL AND is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_dd_steps
     SET status = $1, result = $2, notes = COALESCE($3, notes), completed_by = $4, completed_at = ${completedAt}, updated_at = NOW()
     WHERE step_id = $5 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `SELECT dd.*, (SELECT COUNT(*) FROM "${schema}".vendor_dd_steps s WHERE s.dd_id = dd.dd_id AND s.status = 'completed') AS steps_completed,
       (SELECT COUNT(*) FROM "${schema}".vendor_dd_steps s WHERE s.dd_id = dd.dd_id) AS steps_total
     FROM "${schema}".vendor_due_diligence dd
     WHERE dd.vendor_id = $1 AND dd.deleted_at IS NULL ORDER BY dd.initiated_at DESC`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".vendors ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".vendors ${where}`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".agrc_event_log (event_type, entity_type, payload, created_at)
       VALUES ($1, $2, $3, NOW())`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
     SET training_compliant = $2, training_completion_rate = $3, updated_at = NOW()
     WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `SELECT vtr.training_requirement_id, vtr.training_id, t.title, vtr.required,
            tc.completed_at
     FROM "${schema}".vendor_training_requirements vtr
     LEFT JOIN "${schema}".training_modules t ON t.training_id = vtr.training_id
     LEFT JOIN "${schema}".vendor_training_completions tc
       ON tc.vendor_id = vtr.vendor_id AND tc.training_id = vtr.training_id
     WHERE vtr.vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
     SET privacy_score = $2, pdpl_compliant = $3, updated_at = NOW()
     WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_privacy_assessments
       (vendor_id, privacy_score, pdpl_compliant,
        has_privacy_policy, data_processing_agreement,
        cross_border_transfer_mechanism, data_retention_policy,
        breach_notification_process, dpia_completed,
        consent_management, data_subject_rights_process,
        encryption_at_rest, encryption_in_transit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_privacy_assessments (
      assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id UUID NOT NULL,
      privacy_score NUMERIC(5,2) DEFAULT 0,
      pdpl_compliant BOOLEAN DEFAULT FALSE,
      has_privacy_policy BOOLEAN DEFAULT FALSE,
      data_processing_agreement BOOLEAN DEFAULT FALSE,
      cross_border_transfer_mechanism VARCHAR(100),
      data_retention_policy BOOLEAN DEFAULT FALSE,
      breach_notification_process BOOLEAN DEFAULT FALSE,
      dpia_completed BOOLEAN DEFAULT FALSE,
      consent_management BOOLEAN DEFAULT FALSE,
      data_subject_rights_process BOOLEAN DEFAULT FALSE,
      encryption_at_rest BOOLEAN DEFAULT FALSE,
      encryption_in_transit BOOLEAN DEFAULT FALSE,
      assessment_date TIMESTAMPTZ DEFAULT NOW(),
      assessed_by UUID,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_evidence
         SET status = 'auto_collected',
             source_connector_id = $2,
             source_record_id = $3,
             collected_at = NOW(),
             metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb,
             updated_at = NOW()
         WHERE evidence_id = $1`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `SELECT ve.evidence_id, ve.vendor_id, ve.evidence_type, ve.control_id
     FROM "${schema}".vendor_evidence ve
     WHERE ve.status IN ('pending', 'requested', 'expired')
       AND ve.evidence_type = ANY($1)`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
         SET next_assessment_date = LEAST(next_assessment_date, NOW() + INTERVAL '14 days'),
             updated_at = NOW()
         WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT v.vendor_id, v.name, v.risk_rating
       FROM "${schema}".vendor_shared_responsibility vsr
       JOIN "${schema}".vendors v ON v.vendor_id = vsr.vendor_id AND v.status = 'active'
       WHERE vsr.control_id = ANY($1)
         AND vsr.ownership IN ('vendor', 'shared')`;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, name, risk_tier, assessment_score
     FROM "${schema}".vendors
     WHERE status IS NULL OR status != 'inactive'`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `SELECT document_id, document_type, expiry_date
       FROM "${schema}".vendor_documents
       WHERE vendor_id = $1 AND status = 'active'
         AND document_type IN ('soc2', 'iso27001', 'pci_dss', 'hipaa', 'nca_ecc')
         AND (expiry_date IS NULL OR expiry_date > NOW())`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `SELECT finding_id, title, description, severity
       FROM "${schema}".vendor_findings
       WHERE vendor_id = $1 AND status = 'open'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".findings f
           WHERE f.source_type = 'vendor_assessment' AND f.source_id = $1
             AND f.title LIKE '%' || vendor_findings.title || '%'
         )
       ORDER BY severity DESC LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, name, risk_score, risk_rating, status
     FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_shared_responsibility
         (vendor_id, control_id, ownership, framework_code, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (vendor_id, control_id) DO UPDATE SET ownership = $3, updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".findings
       (title, description, severity, status, source_type, source_id, created_at)
       VALUES ($1, $2, $3, 'open', 'vendor_assessment', $4, NOW())
       RETURNING finding_id`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_tasks
           SET status = 'completed',
               completion_notes = $1,
               completed_at = NOW()
           WHERE task_id = $2`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `SELECT task_id FROM "${schema}".evidence_tasks
         WHERE control_id = $1 AND status IN ('open', 'pending', 'overdue')
         LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `SELECT vsr.control_id
       FROM "${schema}".vendor_shared_responsibility vsr
       WHERE vsr.vendor_id = $1
         AND vsr.ownership IN ('vendor', 'shared')
         AND vsr.control_id IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".compliance_gaps
       (tenant_id, title, description, severity, status, source_type, source_id, control_id, created_at)
       VALUES ($1, $2, $3, $4, 'open', 'vendor', $5, $6, NOW())
       RETURNING gap_id`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risks
       (title, description, category, status, likelihood, impact, risk_score,
        source_type, source_id, ai_assessment, created_at)
       VALUES ($1, $2, 'third_party', 'open', $3, $4, $5, 'vendor', $6, $7, NOW())
       RETURNING risk_id`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks
         SET risk_score = $1, likelihood = $2, impact = $3,
             ai_assessment = $4, updated_at = NOW()
         WHERE risk_id = $5`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `SELECT risk_id FROM "${schema}".risks
       WHERE source_type = 'vendor' AND source_id = $1 AND status != 'closed'
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".board_attention_items
       (source_type, source_id, title, description, severity, recommended_action)
     VALUES ('vendor_critical_risk', $1, $2, $3, 'critical', $4)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `SELECT item_id FROM "${schema}".board_attention_items
     WHERE source_type = 'vendor_critical_risk' AND source_id = $1
       AND status IN ('pending_review', 'under_discussion')
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".board_attention_items (
      item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type VARCHAR(50) NOT NULL,
      source_id UUID,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      severity VARCHAR(20) DEFAULT 'critical',
      status VARCHAR(30) DEFAULT 'pending_review',
      recommended_action TEXT,
      board_decision TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".bcp_test_requirements
       (source_type, source_id, title, description, priority, due_date)
     VALUES ('vendor_concentration', $1, $2, $3, 'high', $4)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `SELECT requirement_id FROM "${schema}".bcp_test_requirements
     WHERE source_type = 'vendor_concentration' AND source_id = $1 AND status != 'completed'
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".bcp_test_requirements (
      requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type VARCHAR(50) NOT NULL DEFAULT 'vendor_concentration',
      source_id UUID,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      priority VARCHAR(20) DEFAULT 'high',
      status VARCHAR(30) DEFAULT 'pending',
      assigned_to UUID,
      due_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `SELECT provider, api_key FROM "${schema}".integration_configs
         WHERE integration_type = 'cyber_rating' AND is_active = true LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, name, website FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendor_audit_log
     ORDER BY created_at DESC
     LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `SELECT ex.*, v.name AS vendor_name
       FROM "${schema}".vendor_exceptions ex
       LEFT JOIN "${schema}".vendors v ON v.vendor_id = ex.vendor_id
       WHERE ex.status = 'pending_approval'
       ORDER BY ex.created_at ASC`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = `SELECT e.*, v.name AS vendor_name
       FROM "${schema}".vendor_engagements e
       LEFT JOIN "${schema}".vendors v ON v.vendor_id = e.vendor_id
       WHERE e.owner_user_id = $1
         AND e.end_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
         AND e.status NOT IN ('terminated', 'expired')
         AND e.deleted_at IS NULL
       ORDER BY e.end_date ASC`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `SELECT dd.*, v.name AS vendor_name
       FROM "${schema}".vendor_due_diligence dd
       LEFT JOIN "${schema}".vendors v ON v.vendor_id = dd.vendor_id
       WHERE dd.reviewer_id = $1 AND dd.status IN ('pending', 'in_progress') AND dd.deleted_at IS NULL
       ORDER BY dd.due_date ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `SELECT i.*, v.name AS vendor_name
       FROM "${schema}".vendor_issues i
       LEFT JOIN "${schema}".vendors v ON v.vendor_id = i.vendor_id
       WHERE i.assigned_to = $1 AND i.status NOT IN ('resolved', 'closed') AND i.deleted_at IS NULL
       ORDER BY
         CASE i.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         i.due_date ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_exceptions
       WHERE status = 'pending_approval'`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_issues
       WHERE status NOT IN ('resolved', 'closed') AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM "${schema}".vendor_risk_assessments WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_concentration_analysis
       WHERE risk_level IN ('high', 'critical')`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_monitoring_signals
       WHERE acknowledged = FALSE`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_sla_breach_log
       WHERE remediation_status NOT IN ('resolved', 'accepted')`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_engagements
       WHERE end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
         AND status NOT IN ('terminated', 'expired')
         AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_due_diligence
       WHERE status IN ('pending', 'in_progress') AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE risk_tier IN ('high', 'critical'))::int AS high_risk
       FROM "${schema}".vendors WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `SELECT e.*, v.name AS vendor_name
     FROM "${schema}".vendor_engagements e
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = e.vendor_id
     WHERE e.end_date IS NOT NULL
       AND e.end_date BETWEEN NOW() AND NOW() + ($1 || ' days')::INTERVAL
       AND e.status NOT IN ('terminated', 'expired')
       AND e.deleted_at IS NULL
     ORDER BY e.end_date ASC`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_engagement_milestones
     SET status = COALESCE($1, status),
         completed_by = COALESCE($2, completed_by),
         notes = COALESCE($3, notes),
         completed_at = ${completedAt}
     WHERE milestone_id = $4 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_engagement_milestones
       (engagement_id, milestone_type, title, due_date, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_engagements SET ${setClauses.join(', ')} WHERE engagement_id = $${params.length} AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
     SET engagement_count = COALESCE(engagement_count, 0) + 1, updated_at = NOW()
     WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_engagements
       (vendor_id, title, engagement_type, contract_ref, start_date, end_date,
        auto_renewal, renewal_notice_days, total_value, currency, status,
        owner_user_id, description, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendor_engagement_milestones
     WHERE engagement_id = $1 ORDER BY due_date ASC NULLS LAST, created_at ASC`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `SELECT e.*, v.name AS vendor_name
     FROM "${schema}".vendor_engagements e
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = e.vendor_id
     WHERE e.engagement_id = $1 AND e.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `SELECT e.*, v.name AS vendor_name
     FROM "${schema}".vendor_engagements e
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = e.vendor_id
     ${whereClause}
     ORDER BY e.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".vendor_engagements e ${whereClause}`;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `SELECT vf.finding_id, vf.vendor_id
       FROM "${schema}".vendor_findings vf
       WHERE vf.source_id = $1 AND vf.status = 'open'
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors SET risk_tier = $2 WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
     SET risk_score = $2, last_risk_assessed_at = NOW(), updated_at = NOW()
     WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) FILTER (WHERE status = 'open' AND severity = 'critical')::int AS critical_open,
       COUNT(*) FILTER (WHERE status = 'open' AND severity = 'high')::int AS high_open,
       COUNT(*) FILTER (WHERE status = 'open' AND severity = 'medium')::int AS medium_open,
       COUNT(*) FILTER (WHERE status = 'open' AND severity = 'low')::int AS low_open,
       COUNT(*) FILTER (WHERE status = 'open')::int AS total_open,
       COUNT(*)::int AS total
     FROM "${schema}".vendor_findings
     WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_findings
     SET status = 'closed', closed_at = NOW(), remediation_notes = $2, updated_at = NOW()
     WHERE finding_id = $1`;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".incidents
     SET vendor_finding_id = $1, updated_at = NOW()
     WHERE incident_id = $2`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_findings
       (vendor_id, source_type, source_id, title, severity, status)
     VALUES ($1, 'incident', $2, $3, $4, 'open')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query138(schema: string, args: unknown[]) {
    const query = `SELECT finding_id FROM "${schema}".vendor_findings
     WHERE vendor_id = $1 AND source_type = 'incident' AND source_id = $2
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query139(schema: string, args: unknown[]) {
    const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_findings (
      finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id UUID NOT NULL,
      source_type VARCHAR(50) NOT NULL DEFAULT 'incident',
      source_id UUID,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      severity VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(30) DEFAULT 'open',
      risk_impact_score NUMERIC(5,2),
      remediation_deadline TIMESTAMPTZ,
      remediation_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    )
  `;
    return safeQuery(query, args);
  }

  static async query140(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_exceptions
     SET status = 'rejected', approved_by = $1, approved_at = NOW(),
         approval_notes = COALESCE($2, approval_notes), updated_at = NOW()
     WHERE exception_id = $3 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query141(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
       SET exception_count = COALESCE(exception_count, 0) + 1, updated_at = NOW()
       WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query142(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_exceptions
     SET status = 'approved', approved_by = $1, approved_at = NOW(),
         approval_notes = COALESCE($2, approval_notes), updated_at = NOW()
     WHERE exception_id = $3 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query143(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_exceptions
       (vendor_id, issue_id, exception_type, title, justification, risk_assessment,
        compensating_controls, valid_from, valid_until, requested_by, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending_approval') RETURNING *`;
    return safeQuery(query, args);
  }

  static async query144(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query145(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_issues
     SET escalated_to = $1, escalated_at = NOW(), status = 'escalated', updated_at = NOW()
     WHERE issue_id = $2 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query146(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
       SET active_issues_count = GREATEST(COALESCE(active_issues_count, 0) - 1, 0), updated_at = NOW()
       WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query147(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_issues SET ${setClauses.join(', ')} WHERE issue_id = $${params.length} AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query148(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
     SET active_issues_count = COALESCE(active_issues_count, 0) + 1, updated_at = NOW()
     WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query149(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_issues
       (vendor_id, source_type, source_id, title, description, severity, assigned_to, due_date, risk_impact, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query150(schema: string, args: unknown[]) {
    const query = `SELECT i.*, v.name AS vendor_name
     FROM "${schema}".vendor_issues i
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = i.vendor_id
     WHERE i.issue_id = $1 AND i.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query151(schema: string, args: unknown[]) {
    const query = `SELECT i.*, v.name AS vendor_name
     FROM "${schema}".vendor_issues i
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = i.vendor_id
     ${whereClause}
     ORDER BY
       CASE i.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
       i.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`;
    return safeQuery(query, args);
  }

  static async query152(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".vendor_issues i ${whereClause}`;
    return safeQuery(query, args);
  }

  static async query153(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors SET status = 'offboarding', updated_at = NOW() WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query154(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_offboarding
         (vendor_id, reason, status, initiated_by, created_at)
       VALUES ($1, $2, 'initiated', $3, NOW())
       RETURNING id`;
    return safeQuery(query, args);
  }

  static async query155(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_dd_steps
       SET status = 'escalated', updated_at = NOW()
       WHERE status = 'pending'
         AND created_at < NOW() - ($1 || ' days')::interval
         AND escalated_at IS NULL
       RETURNING id`;
    return safeQuery(query, args);
  }

  static async query156(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_due_diligence SET status = $1, completed_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query157(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pending,
              COUNT(*) FILTER (WHERE status = 'failed') AS failed
       FROM "${schema}".vendor_dd_steps WHERE due_diligence_id = $1`;
    return safeQuery(query, args);
  }

  static async query158(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_dd_steps
       SET status = $1, notes = $2, completed_by = $3, completed_at = NOW()
       WHERE due_diligence_id = $4 AND step_code = $5`;
    return safeQuery(query, args);
  }

  static async query159(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_dd_steps
           (due_diligence_id, step_code, step_name, sequence_no, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())`;
    return safeQuery(query, args);
  }

  static async query160(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_due_diligence
         (vendor_id, assessment_type, status, initiated_by, created_at, updated_at)
       VALUES ($1, $2, 'in_progress', $3, NOW(), NOW())
       RETURNING id`;
    return safeQuery(query, args);
  }

  static async query161(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_portal_messages
     SET read_at = NOW()
     WHERE message_id = $1 AND read_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query162(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendor_portal_messages
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${idx}`;
    return safeQuery(query, args);
  }

  static async query163(schema: string, args: unknown[]) {
    const query = `SELECT owner_id FROM "${schema}".vendors WHERE vendor_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query164(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_portal_messages
       (vendor_id, sender_id, sender_type, subject, body, parent_message_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query165(schema: string, args: unknown[]) {
    const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_portal_messages (
      message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id UUID NOT NULL,
      sender_id UUID NOT NULL,
      sender_type VARCHAR(20) NOT NULL DEFAULT 'grc_team',
      subject VARCHAR(500) NOT NULL,
      body TEXT NOT NULL,
      parent_message_id UUID,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
    return safeQuery(query, args);
  }

  static async query166(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_questionnaire_submissions SET
      reviewed_at = NOW(), reviewer_id = $2, review_notes = $3,
      status = $4
     WHERE submission_id = $1`;
    return safeQuery(query, args);
  }

  static async query167(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendor_questionnaire_submissions
     WHERE vendor_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query168(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_questionnaire_submissions
     (submission_id, vendor_id, questionnaire_id, token_id, answers, status, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (submission_id) DO UPDATE SET answers = EXCLUDED.answers, status = EXCLUDED.status`;
    return safeQuery(query, args);
  }

  static async query169(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_portal_tokens SET revoked = true WHERE token_id = $1`;
    return safeQuery(query, args);
  }

  static async query170(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendor_portal_tokens SET last_used_at = NOW()
     WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()
     RETURNING token_id, vendor_id, scope`;
    return safeQuery(query, args);
  }

  static async query171(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_portal_tokens
     (token_id, vendor_id, token_hash, scope, expires_at)
     VALUES ($1, $2, $3, $4, $5)`;
    return safeQuery(query, args);
  }

  static async query172(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_risk_assessments
       (vendor_id, questionnaire_id, overall_score, risk_rating, category_scores, critical_flags, assessed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query173(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
       SET risk_score = $1, risk_rating = $2, last_assessed_at = NOW(),
           questionnaire_score = $1, critical_flags = $3, updated_at = NOW()
       WHERE vendor_id = $4`;
    return safeQuery(query, args);
  }

  static async query174(schema: string, args: unknown[]) {
    const query = `SELECT
       TO_CHAR(DATE_TRUNC('month', completed_at), 'YYYY-MM') AS month,
       COUNT(*)::int AS assessment_count,
       AVG(overall_score)::numeric(5,2) AS avg_score,
       MIN(overall_score)::numeric(5,2) AS min_score,
       MAX(overall_score)::numeric(5,2) AS max_score
     FROM "${schema}".vendor_risk_assessments
     WHERE completed_at IS NOT NULL
       AND completed_at >= NOW() - ($1 || ' months')::INTERVAL
       AND deleted_at IS NULL
     GROUP BY DATE_TRUNC('month', completed_at)
     ORDER BY DATE_TRUNC('month', completed_at) ASC`;
    return safeQuery(query, args);
  }

  static async query175(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(data_access_level, 'none') AS data_access_level, COUNT(*)::int AS cnt
       FROM "${schema}".vendor_fourth_party_risk
       WHERE is_active = TRUE AND deleted_at IS NULL
       GROUP BY data_access_level ORDER BY data_access_level`;
    return safeQuery(query, args);
  }

  static async query176(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(risk_tier, 'unclassified') AS risk_tier, COUNT(*)::int AS cnt
       FROM "${schema}".vendor_fourth_party_risk
       WHERE is_active = TRUE AND deleted_at IS NULL
       GROUP BY risk_tier
       ORDER BY CASE risk_tier WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`;
    return safeQuery(query, args);
  }

  static async query177(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_fourth_party_risk
       WHERE is_active = TRUE AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query178(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE is_met = TRUE)::int AS met,
       COUNT(*) FILTER (WHERE is_warning = TRUE)::int AS warning,
       COUNT(*) FILTER (WHERE is_breached = TRUE)::int AS breached
     FROM "${schema}".vendor_sla_measurements
     WHERE period_start >= NOW() - ($1 || ' months')::INTERVAL`;
    return safeQuery(query, args);
  }

  static async query179(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS cnt
     FROM "${schema}".vendor_due_diligence WHERE deleted_at IS NULL
     GROUP BY status ORDER BY status`;
    return safeQuery(query, args);
  }

  static async query180(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(risk_tier, 'unclassified') AS risk_tier, COUNT(*)::int AS vendor_count
     FROM "${schema}".vendors WHERE deleted_at IS NULL
     GROUP BY risk_tier
     ORDER BY CASE risk_tier WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`;
    return safeQuery(query, args);
  }

  static async query181(schema: string, args: unknown[]) {
    const query = `SELECT dimension, dimension_value, vendor_count, total_spend, spend_pct,
            risk_level, concentration_score, analysis_date
     FROM "${schema}".vendor_concentration_analysis
     ORDER BY analysis_date DESC, concentration_score DESC`;
    return safeQuery(query, args);
  }

  static async query182(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, name, risk_tier, assessment_score, status
       FROM "${schema}".vendors WHERE deleted_at IS NULL
       ORDER BY
         CASE risk_tier WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
         assessment_score ASC NULLS FIRST
       LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query183(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(risk_tier, 'unclassified') AS risk_tier, COUNT(*)::int AS vendor_count
       FROM "${schema}".vendors WHERE deleted_at IS NULL
       GROUP BY risk_tier ORDER BY
         CASE risk_tier WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`;
    return safeQuery(query, args);
  }

  static async query184(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) FILTER (WHERE assessment_score >= 90)::int AS "A",
         COUNT(*) FILTER (WHERE assessment_score >= 80 AND assessment_score < 90)::int AS "B",
         COUNT(*) FILTER (WHERE assessment_score >= 70 AND assessment_score < 80)::int AS "C",
         COUNT(*) FILTER (WHERE assessment_score >= 60 AND assessment_score < 70)::int AS "D",
         COUNT(*) FILTER (WHERE assessment_score < 60 OR assessment_score IS NULL)::int AS "F"
       FROM "${schema}".vendors WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query185(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total, COALESCE(AVG(assessment_score), 0)::numeric(5,2) AS avg_score
       FROM "${schema}".vendors WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query186(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_concentration_alerts
       (vendor_id, concentration_type, concentration_percentage, threshold, mitigation_task_count)
     VALUES ($1, $2, $3, $4, $5)`;
    return safeQuery(query, args);
  }

  static async query187(schema: string, args: unknown[]) {
    const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_concentration_alerts (
      alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id UUID NOT NULL,
      concentration_type VARCHAR(30) NOT NULL,
      concentration_percentage NUMERIC(5,2) NOT NULL,
      threshold NUMERIC(5,2) NOT NULL,
      mitigation_task_count INT DEFAULT 0,
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `;
    return safeQuery(query, args);
  }

  static async query188(schema: string, args: unknown[]) {
    const query = `SELECT name FROM "${schema}".vendors WHERE vendor_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query189(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors SET risk_tier = $2 WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query190(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
     SET risk_score = $2,
         sub_vendor_risk_contribution = $3,
         updated_at = NOW()
     WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query191(schema: string, args: unknown[]) {
    const query = `SELECT sv.sub_vendor_id, sv.criticality, v.risk_score, v.risk_tier, v.name
     FROM "${schema}".vendor_sub_vendors sv
     JOIN "${schema}".vendors v ON v.vendor_id = sv.sub_vendor_id
     WHERE sv.parent_vendor_id = $1 AND sv.status = 'active'`;
    return safeQuery(query, args);
  }

  static async query192(schema: string, args: unknown[]) {
    const query = `SELECT risk_score, risk_tier FROM "${schema}".vendors WHERE vendor_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query193(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendor_benchmarks (vendor_id, cohort_category, cohort_size, rankings)
     VALUES ($1, $2, $3, $4)`;
    return safeQuery(query, args);
  }

  static async query194(schema: string, args: unknown[]) {
    const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_benchmarks (
      benchmark_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id UUID NOT NULL,
      cohort_category VARCHAR(100),
      cohort_size INT,
      rankings JSONB,
      computed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
    return safeQuery(query, args);
  }

  static async query195(schema: string, args: unknown[]) {
    const query = `SELECT
       vf.vendor_id,
       COUNT(vf.finding_id)::int AS total,
       COUNT(vf.finding_id) FILTER (WHERE vf.status = 'closed')::int AS closed
     FROM "${schema}".vendor_findings vf
     JOIN "${schema}".vendors v ON v.vendor_id = vf.vendor_id
     WHERE v.category = $1
     GROUP BY vf.vendor_id`;
    return safeQuery(query, args);
  }

  static async query196(schema: string, args: unknown[]) {
    const query = `SELECT
       v.vendor_id,
       COUNT(pt.task_id)::int AS total_tasks,
       COUNT(pt.task_id) FILTER (WHERE pt.completed_at <= pt.due_date OR pt.status = 'completed')::int AS on_time
     FROM "${schema}".vendors v
     LEFT JOIN "${schema}".process_tasks pt ON pt.entity_id = v.vendor_id::text AND pt.entity_type LIKE 'vendor%'
     WHERE v.category = $1 AND v.status IN ('active', 'approved')
     GROUP BY v.vendor_id`;
    return safeQuery(query, args);
  }

  static async query197(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, risk_score, privacy_score
     FROM "${schema}".vendors
     WHERE category = $1 AND status IN ('active', 'approved')
     ORDER BY risk_score ASC`;
    return safeQuery(query, args);
  }

  static async query198(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, category, risk_tier, risk_score, privacy_score
     FROM "${schema}".vendors
     WHERE vendor_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query199(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflows
       WHERE name ILIKE '%vendor%remediation%'
         AND status = 'active'
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query200(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors
     SET next_review_date = NOW() + ($1 || ' days')::INTERVAL
     WHERE vendor_id = $2`;
    return safeQuery(query, args);
  }

  static async query201(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".questionnaires
       (vendor_id, title, status, created_by, distributed_at)
     VALUES ($1, $2, 'distributed', $3, NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query202(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id FROM "${schema}".vendors WHERE name ILIKE $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query203(schema: string, args: unknown[]) {
    const query = `SELECT
       q.questionnaire_id,
       q.vendor_id,
       v.name AS vendor_name,
       q.title AS template_name,
       q.distributed_at AS sent_at,
       q.status,
       (q.evaluation->>'score')::numeric AS score,
       q.due_date,
       q.completed_at,
       q.created_at
     FROM "${schema}".questionnaires q
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = q.vendor_id
     ORDER BY q.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query204(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendor_shared_responsibility
     WHERE vendor_id = $1
     ORDER BY control_area ASC`;
    return safeQuery(query, args);
  }

  static async query205(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query206(schema: string, args: unknown[]) {
    const query = `SELECT
       v.vendor_id,
       v.name,
       v.category,
       v.risk_tier,
       v.assessment_score,
       v.contract_expiry,
       v.next_review_date,
       v.status,
       v.tier_factors,
       v.onboarded_at,
       CASE
         WHEN v.contract_expiry IS NULL THEN 'no_contract'
         WHEN v.contract_expiry < NOW() THEN 'expired'
         WHEN v.contract_expiry < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
         ELSE 'active'
       END AS contract_status,
       COALESCE(f.open_findings, 0) AS open_findings,
       COALESCE(f.remediated_findings, 0) AS remediated_findings
     FROM "${schema}".vendors v
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE status = 'open') AS open_findings,
         COUNT(*) FILTER (WHERE status = 'remediated') AS remediated_findings
       FROM "${schema}".vendor_findings vf
       WHERE vf.vendor_id = v.vendor_id
     ) f ON true
     ORDER BY
       CASE v.risk_tier
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
         ELSE 5
       END,
       v.name ASC`;
    return safeQuery(query, args);
  }

  static async query207(schema: string, args: unknown[]) {
    const query = `SELECT v.*, vtc.review_frequency, vtc.remediation_sla_days
     FROM "${schema}".vendors v
     LEFT JOIN "${schema}".vendor_tier_config vtc ON vtc.tier = v.risk_tier
     WHERE v.next_review_date <= NOW()
       AND v.status = 'active'
     ORDER BY v.next_review_date ASC`;
    return safeQuery(query, args);
  }

  static async query208(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendors
      (name, category, risk_tier, tier_factors, contact_email, contract_expiry, status, onboarded_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query209(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors SET
      risk_tier = $1,
      tier_factors = $2,
      updated_at = NOW()
     WHERE vendor_id = $3
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query210(schema: string, args: unknown[]) {
    const query = `SELECT historical_scores FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query211(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id FROM "${schema}".vendors WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query212(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, name, historical_scores FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query213(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query214(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".vendors SET
      name = COALESCE($1, name),
      category = COALESCE($2, category),
      risk_tier = COALESCE($3, risk_tier),
      assessment_score = COALESCE($4, assessment_score),
      contract_expiry = COALESCE($5, contract_expiry),
      sla_config = COALESCE($6, sla_config),
      status = COALESCE($7, status)
     WHERE vendor_id = $8
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query215(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query216(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendors ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query217(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".vendors WHERE created_by = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query218(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".vendors
      (name, category, risk_tier, assessment_score, contract_expiry, sla_config, owner_user_id, created_by, org_unit_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8)
     RETURNING *`;
    return safeQuery(query, args);
  }

}
