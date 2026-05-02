// @ts-nocheck
// Auto-extracted Portals repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class PortalsAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portal_access_logs
     WHERE portal_id = $1
     ORDER BY created_at DESC LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".portal_access_logs
      (portal_id, external_user_id, ip_address, action, resource_type, resource_id, status_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".portal_sessions
      (token_id, portal_id, external_user_id, ip_address, user_agent, expires_at, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_tokens SET is_revoked = true, updated_at = NOW() WHERE token_id = $1`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_tokens SET last_used_at = NOW() WHERE token_id = $1`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portal_tokens
     WHERE token_hash = $1 AND is_revoked = false AND expires_at > NOW() LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".portal_tokens
      (portal_id, external_user_id, external_org, token_hash, expires_at, is_revoked)
     VALUES ($1, $2, $3, $4, $5, false)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".portals ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".portals ${where}`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portals WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portals WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portals WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portal_assessments WHERE assessment_id = $1`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_assessments
     SET score = $1, max_score = $2, status = 'completed', reviewed_at = NOW(), updated_at = NOW()
     WHERE assessment_id = $3
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT score, max_score FROM "${schema}".portal_assessment_responses WHERE assessment_id = $1`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_assessments
     SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
     WHERE assessment_id = $1 AND external_org_id = $2 AND status = 'in_progress'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_assessments
     SET answered_questions = (
       SELECT COUNT(*) FROM "${schema}".portal_assessment_responses WHERE assessment_id = $1
     ), updated_at = NOW()
     WHERE assessment_id = $1`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".portal_assessment_responses
      (assessment_id, question_id, question_text, question_type, answer, max_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (assessment_id, question_id)
     DO UPDATE SET answer = EXCLUDED.answer, answered_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_assessments
     SET status = 'in_progress', updated_at = NOW()
     WHERE assessment_id = $1 AND external_org_id = $2 AND status = 'draft'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portal_assessments WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_evidence_requests
     SET status = 'overdue', updated_at = NOW()
     WHERE status = 'open' AND due_date IS NOT NULL AND due_date < NOW()`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_finding_acknowledgments
     SET status = $1, acknowledgment_note = $2, acknowledged_at = NOW(), updated_at = NOW()
     WHERE finding_id = $3 AND status = 'pending'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_evidence_requests
     SET status = 'fulfilled', evidence_links = $1, fulfilled_at = NOW(), updated_at = NOW()
     WHERE request_id = $2 AND status = 'open'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portal_evidence_requests WHERE ${conditions.join(" AND ")} ORDER BY due_date ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portal_audit_schedule
     WHERE portal_id = $1 AND scheduled_at >= NOW()
     ORDER BY scheduled_at ASC LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".portal_finding_acknowledgments
     WHERE portal_id = $1 AND auditor_org_id = $2 AND status = 'pending'`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'fulfilled') AS fulfilled,
       COUNT(*) FILTER (WHERE status = 'open') AS open_count
     FROM "${schema}".portal_evidence_requests
     WHERE portal_id = $1 AND auditor_org_id = $2`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT title FROM "${schema}".portals_portals WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portal_widgets WHERE portal_id = $1 AND is_visible = true ORDER BY sort_order ASC`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portal_pages WHERE portal_id = $1 ORDER BY sort_order ASC`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".portal_widgets
      (portal_id, page_id, widget_type, title_en, title_ar, config, sort_order, is_visible)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_pages SET ${sets.join(", ")} WHERE page_id = $${idx} RETURNING *`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_pages
     SET status = 'published', published_at = NOW(), version = version + 1, updated_at = NOW()
     WHERE page_id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".portal_page_versions
      (page_id, version, content_en, content_ar, layout, archived_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portal_pages WHERE page_id = $1`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".portal_pages
      (portal_id, slug, title_en, title_ar, content_en, content_ar,
       status, sort_order, layout, version, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, 1, $9)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT p.portal_id)::int AS with_content
         FROM "${schema}".portals p
         INNER JOIN "${schema}".portal_content pc ON pc.portal_id = p.portal_id
         WHERE pc.status = 'published'`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT user_id)::int AS total_users
         FROM "${schema}".portal_users pu
         INNER JOIN "${schema}".portals p ON p.portal_id = pu.portal_id
         WHERE p.status = 'active'`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
           COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS recently_created
         FROM "${schema}".portals`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".portal_configs WHERE status = 'draft' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".portal_configs WHERE status = 'suspended' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".portal_configs WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'portals' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'portals','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portals_portals WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portals_portals
     SET metadata = COALESCE(metadata, '{}'::jsonb) || $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portals_portals
     SET theme = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portals_portals
     SET status = 'inactive', updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portals_portals
     SET status = 'active', updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".portals_portals
      (tenant_id, title, description, status, portal_type, theme, access_level,
       external_org_id, config, tags, created_by)
     VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_document_uploads
     SET status = $1, review_note = $2, reviewed_at = NOW(), updated_at = NOW()
     WHERE upload_id = $3
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".portal_document_uploads
      (portal_id, vendor_org_id, file_name, file_size, file_type, storage_key,
       uploaded_by, requested_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_review')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portal_questionnaires
     SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
     WHERE questionnaire_id = $1 AND vendor_org_id = $2 AND status IN ('not_started', 'in_progress')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".portal_questionnaires
     WHERE portal_id = $1 AND vendor_org_id = $2 ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT MAX(uploaded_at) AS last_at FROM "${schema}".portal_document_uploads
     WHERE portal_id = $1 AND vendor_org_id = $2`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".portal_document_uploads
     WHERE portal_id = $1 AND vendor_org_id = $2 AND status = 'pending_review'`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".portal_questionnaires WHERE portal_id = $1 AND vendor_org_id = $2`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT title FROM "${schema}".portals_portals WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".portals WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail
     WHERE tenant_id = $1 AND entity_id = $2 AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority)
       VALUES ($1, $2, $3, $4, $5, true, 'high')`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state)
     VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".portals SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

}
