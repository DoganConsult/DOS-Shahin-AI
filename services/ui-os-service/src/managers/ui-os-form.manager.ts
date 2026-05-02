import type { DbPool } from '../db.js';

/**
 * Wave 11c-§7 Forms — manager covering 10 §7 tables created by
 * migrations 20260502_0106/0107/0108:
 *
 *   ui_form_definitions, ui_form_sections, ui_form_fields,
 *   ui_form_field_rules, ui_form_validation_rules, ui_form_default_values,
 *   ui_form_submissions, ui_form_drafts, ui_form_attachments,
 *   ui_form_approval_links
 *
 * All queries scope by tenant_id. Identity headers (tenant/user) come from
 * the gateway-origin verified principal — never req.body.
 */
export class UiOsFormManager {
  constructor(private readonly pool: DbPool) {}

  // ── Definitions ─────────────────────────────────────────────
  async listDefinitions(tenantId: string, filter?: { moduleCode?: string | null; productCode?: string | null }) {
    const { rows } = await this.pool.query(
      `SELECT id::text, tenant_id, form_key, version, module_code, product_code,
              entity_kind, submit_workflow_code, title_key, description_key, is_active
         FROM dos.ui_form_definitions
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR module_code=$2)
          AND ($3::text IS NULL OR product_code=$3)
        ORDER BY form_key, version DESC`,
      [tenantId, filter?.moduleCode ?? null, filter?.productCode ?? null]);
    return rows;
  }
  async getDefinition(tenantId: string, formKey: string, version?: number) {
    const { rows } = await this.pool.query(
      `SELECT id::text, tenant_id, form_key, version, module_code, product_code,
              entity_kind, submit_workflow_code, title_key, description_key, is_active
         FROM dos.ui_form_definitions
        WHERE tenant_id=$1 AND form_key=$2
          AND ($3::int IS NULL OR version=$3)
        ORDER BY version DESC LIMIT 1`,
      [tenantId, formKey, version ?? null]);
    return rows[0] ?? null;
  }
  async createDefinition(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_form_definitions
        (tenant_id, form_key, version, module_code, product_code, entity_kind,
         submit_workflow_code, title_key, description_key, created_by, updated_by)
       VALUES ($1,$2,COALESCE($3,1),$4,$5,$6,$7,$8,$9,$10,$10)
       RETURNING id::text, form_key, version, is_active`,
      [tenantId, body.form_key, body.version ?? null, body.module_code ?? null,
       body.product_code ?? null, body.entity_kind ?? null,
       body.submit_workflow_code ?? null, body.title_key ?? null,
       body.description_key ?? null, userId]);
    return rows[0];
  }
  async updateDefinition(tenantId: string, formId: string, userId: string, patch: any) {
    const { rows } = await this.pool.query(
      `UPDATE dos.ui_form_definitions
          SET module_code=COALESCE($3, module_code),
              product_code=COALESCE($4, product_code),
              entity_kind=COALESCE($5, entity_kind),
              submit_workflow_code=COALESCE($6, submit_workflow_code),
              title_key=COALESCE($7, title_key),
              description_key=COALESCE($8, description_key),
              is_active=COALESCE($9, is_active),
              updated_by=$10, updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid
        RETURNING id::text, form_key, version, is_active`,
      [tenantId, formId, patch.module_code ?? null, patch.product_code ?? null,
       patch.entity_kind ?? null, patch.submit_workflow_code ?? null,
       patch.title_key ?? null, patch.description_key ?? null,
       patch.is_active ?? null, userId]);
    return rows[0] ?? null;
  }
  async deleteDefinition(tenantId: string, formId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_form_definitions WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, formId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Sections ────────────────────────────────────────────────
  async listSections(tenantId: string, formId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, section_key, display_order, title_key, description_key,
              is_collapsible, default_collapsed, is_active
         FROM dos.ui_form_sections
        WHERE tenant_id=$1 AND form_definition_id=$2::uuid
        ORDER BY display_order, section_key`,
      [tenantId, formId]);
    return rows;
  }
  async upsertSection(tenantId: string, formId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_form_sections
        (tenant_id, form_definition_id, section_key, display_order,
         title_key, description_key, is_collapsible, default_collapsed)
       VALUES ($1,$2::uuid,$3,COALESCE($4,0),$5,$6,COALESCE($7,FALSE),COALESCE($8,FALSE))
       ON CONFLICT (form_definition_id, section_key) DO UPDATE
         SET display_order=EXCLUDED.display_order,
             title_key=EXCLUDED.title_key,
             description_key=EXCLUDED.description_key,
             is_collapsible=EXCLUDED.is_collapsible,
             default_collapsed=EXCLUDED.default_collapsed,
             updated_at=NOW()
       RETURNING id::text, section_key, display_order`,
      [tenantId, formId, body.section_key, body.display_order ?? null,
       body.title_key ?? null, body.description_key ?? null,
       body.is_collapsible ?? null, body.default_collapsed ?? null]);
    return rows[0];
  }
  async deleteSection(tenantId: string, sectionId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_form_sections WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, sectionId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Fields ──────────────────────────────────────────────────
  async listFields(tenantId: string, sectionId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, field_key, field_kind::text AS field_kind, display_order,
              label_key, help_key, placeholder_key, width_units,
              is_readonly, is_required, is_active, metadata
         FROM dos.ui_form_fields
        WHERE tenant_id=$1 AND form_section_id=$2::uuid
        ORDER BY display_order, field_key`,
      [tenantId, sectionId]);
    return rows;
  }
  async upsertField(tenantId: string, sectionId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_form_fields
        (tenant_id, form_section_id, field_key, field_kind, display_order,
         label_key, help_key, placeholder_key, width_units,
         is_readonly, is_required, metadata)
       VALUES ($1,$2::uuid,$3,$4::dos.ui_form_field_kind_t,COALESCE($5,0),
               $6,$7,$8,COALESCE($9,12),
               COALESCE($10,FALSE),COALESCE($11,FALSE),COALESCE($12::jsonb,'{}'::jsonb))
       ON CONFLICT (form_section_id, field_key) DO UPDATE
         SET field_kind=EXCLUDED.field_kind,
             display_order=EXCLUDED.display_order,
             label_key=EXCLUDED.label_key,
             help_key=EXCLUDED.help_key,
             placeholder_key=EXCLUDED.placeholder_key,
             width_units=EXCLUDED.width_units,
             is_readonly=EXCLUDED.is_readonly,
             is_required=EXCLUDED.is_required,
             metadata=EXCLUDED.metadata,
             updated_at=NOW()
       RETURNING id::text, field_key, field_kind::text AS field_kind`,
      [tenantId, sectionId, body.field_key, body.field_kind, body.display_order ?? null,
       body.label_key ?? null, body.help_key ?? null, body.placeholder_key ?? null,
       body.width_units ?? null, body.is_readonly ?? null, body.is_required ?? null,
       body.metadata !== undefined ? JSON.stringify(body.metadata) : null]);
    return rows[0];
  }
  async deleteField(tenantId: string, fieldId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_form_fields WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, fieldId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Field rules ─────────────────────────────────────────────
  async listFieldRules(tenantId: string, fieldId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, rule_kind::text AS rule_kind, expression, message_key, priority, is_active
         FROM dos.ui_form_field_rules
        WHERE tenant_id=$1 AND form_field_id=$2::uuid
        ORDER BY priority, rule_kind`,
      [tenantId, fieldId]);
    return rows;
  }
  async createFieldRule(tenantId: string, userId: string, fieldId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_form_field_rules
        (tenant_id, form_field_id, rule_kind, expression, message_key, priority, created_by, updated_by)
       VALUES ($1,$2::uuid,$3::dos.ui_form_rule_kind_t,COALESCE($4::jsonb,'{}'::jsonb),$5,COALESCE($6,100),$7,$7)
       RETURNING id::text, rule_kind::text AS rule_kind, priority`,
      [tenantId, fieldId, body.rule_kind,
       body.expression !== undefined ? JSON.stringify(body.expression) : null,
       body.message_key ?? null, body.priority ?? null, userId]);
    return rows[0];
  }
  async deleteFieldRule(tenantId: string, ruleId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_form_field_rules WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, ruleId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Validation rules ────────────────────────────────────────
  async listValidationRules(tenantId: string, fieldId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, validator_kind::text AS validator_kind, params, message_key, is_active
         FROM dos.ui_form_validation_rules
        WHERE tenant_id=$1 AND form_field_id=$2::uuid
        ORDER BY validator_kind`,
      [tenantId, fieldId]);
    return rows;
  }
  async upsertValidationRule(tenantId: string, fieldId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_form_validation_rules
        (tenant_id, form_field_id, validator_kind, params, message_key)
       VALUES ($1,$2::uuid,$3::dos.ui_form_validator_kind_t,COALESCE($4::jsonb,'{}'::jsonb),$5)
       ON CONFLICT (form_field_id, validator_kind) DO UPDATE
         SET params=EXCLUDED.params, message_key=EXCLUDED.message_key, updated_at=NOW()
       RETURNING id::text, validator_kind::text AS validator_kind`,
      [tenantId, fieldId, body.validator_kind,
       body.params !== undefined ? JSON.stringify(body.params) : null,
       body.message_key ?? null]);
    return rows[0];
  }
  async deleteValidationRule(tenantId: string, ruleId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_form_validation_rules WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, ruleId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Default values ──────────────────────────────────────────
  async getDefaultValue(tenantId: string, fieldId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, default_kind::text AS default_kind, value, expression, is_active
         FROM dos.ui_form_default_values
        WHERE tenant_id=$1 AND form_field_id=$2::uuid LIMIT 1`,
      [tenantId, fieldId]);
    return rows[0] ?? null;
  }
  async upsertDefaultValue(tenantId: string, fieldId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_form_default_values
        (tenant_id, form_field_id, default_kind, value, expression)
       VALUES ($1,$2::uuid,$3::dos.ui_form_default_kind_t,$4::jsonb,$5::jsonb)
       ON CONFLICT (form_field_id) DO UPDATE
         SET default_kind=EXCLUDED.default_kind,
             value=EXCLUDED.value,
             expression=EXCLUDED.expression,
             updated_at=NOW()
       RETURNING id::text, default_kind::text AS default_kind`,
      [tenantId, fieldId, body.default_kind,
       body.value !== undefined ? JSON.stringify(body.value) : null,
       body.expression !== undefined ? JSON.stringify(body.expression) : null]);
    return rows[0];
  }

  // ── Submissions ─────────────────────────────────────────────
  async listSubmissions(tenantId: string, filter: { formId?: string | null; submitterUserId?: string | null; status?: string | null; entityId?: string | null }) {
    const { rows } = await this.pool.query(
      `SELECT id::text, form_definition_id::text AS form_definition_id,
              submitter_user_id, entity_kind, entity_id::text AS entity_id,
              status::text AS status, submitted_at, approved_at, rejected_at, withdrawn_at, created_at
         FROM dos.ui_form_submissions
        WHERE tenant_id=$1
          AND ($2::uuid IS NULL OR form_definition_id=$2)
          AND ($3::text IS NULL OR submitter_user_id=$3)
          AND ($4::text IS NULL OR status::text=$4)
          AND ($5::uuid IS NULL OR entity_id=$5)
        ORDER BY created_at DESC LIMIT 500`,
      [tenantId, filter.formId ?? null, filter.submitterUserId ?? null,
       filter.status ?? null, filter.entityId ?? null]);
    return rows;
  }
  async getSubmission(tenantId: string, submissionId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, form_definition_id::text AS form_definition_id,
              submitter_user_id, entity_kind, entity_id::text AS entity_id,
              payload, status::text AS status, submitted_at, approved_at,
              rejected_at, withdrawn_at, metadata, created_at, updated_at
         FROM dos.ui_form_submissions
        WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1`,
      [tenantId, submissionId]);
    return rows[0] ?? null;
  }
  async createSubmission(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_form_submissions
        (tenant_id, form_definition_id, submitter_user_id, entity_kind, entity_id,
         payload, status, submitted_at, metadata)
       VALUES ($1,$2::uuid,$3,$4,$5::uuid,
               COALESCE($6::jsonb,'{}'::jsonb),
               COALESCE($7,'draft')::dos.ui_form_submission_status_t,
               CASE WHEN $7='submitted' THEN NOW() ELSE NULL END,
               COALESCE($8::jsonb,'{}'::jsonb))
       RETURNING id::text, status::text AS status, submitted_at`,
      [tenantId, body.form_definition_id, userId, body.entity_kind ?? null,
       body.entity_id ?? null,
       body.payload !== undefined ? JSON.stringify(body.payload) : null,
       body.status ?? null,
       body.metadata !== undefined ? JSON.stringify(body.metadata) : null]);
    return rows[0];
  }
  async transitionSubmission(tenantId: string, submissionId: string, status: 'submitted' | 'approved' | 'rejected' | 'withdrawn' | 'superseded') {
    const stamp = status === 'submitted' ? 'submitted_at'
      : status === 'approved' ? 'approved_at'
      : status === 'rejected' ? 'rejected_at'
      : status === 'withdrawn' ? 'withdrawn_at'
      : null;
    const { rows } = await this.pool.query(
      `UPDATE dos.ui_form_submissions
          SET status=$3::dos.ui_form_submission_status_t,
              ${stamp ? `${stamp}=NOW(),` : ''}
              updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid
        RETURNING id::text, status::text AS status, submitted_at, approved_at, rejected_at, withdrawn_at`,
      [tenantId, submissionId, status]);
    return rows[0] ?? null;
  }

  // ── Drafts ──────────────────────────────────────────────────
  async getDraft(tenantId: string, userId: string, formId: string, entityId: string | null) {
    const { rows } = await this.pool.query(
      `SELECT id::text, form_definition_id::text AS form_definition_id,
              user_id, entity_kind, entity_id::text AS entity_id,
              payload, last_autosave_at, created_at, updated_at
         FROM dos.ui_form_drafts
        WHERE tenant_id=$1 AND user_id=$2 AND form_definition_id=$3::uuid
          AND ($4::uuid IS NOT DISTINCT FROM entity_id)
        LIMIT 1`,
      [tenantId, userId, formId, entityId]);
    return rows[0] ?? null;
  }
  async upsertDraft(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_form_drafts
        (tenant_id, form_definition_id, user_id, entity_kind, entity_id, payload, last_autosave_at)
       VALUES ($1,$2::uuid,$3,$4,$5::uuid,COALESCE($6::jsonb,'{}'::jsonb),NOW())
       ON CONFLICT (tenant_id, form_definition_id, user_id, entity_id) DO UPDATE
         SET payload=EXCLUDED.payload,
             last_autosave_at=NOW(),
             updated_at=NOW()
       RETURNING id::text, last_autosave_at`,
      [tenantId, body.form_definition_id, userId, body.entity_kind ?? null,
       body.entity_id ?? null,
       body.payload !== undefined ? JSON.stringify(body.payload) : null]);
    return rows[0];
  }
  async deleteDraft(tenantId: string, draftId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_form_drafts WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, draftId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Attachments ─────────────────────────────────────────────
  async listAttachments(tenantId: string, owner: { submissionId?: string | null; draftId?: string | null }) {
    const { rows } = await this.pool.query(
      `SELECT id::text, form_submission_id::text AS form_submission_id,
              form_draft_id::text AS form_draft_id,
              file_name, mime_type, size_bytes, storage_url, checksum, uploaded_by, created_at
         FROM dos.ui_form_attachments
        WHERE tenant_id=$1
          AND ($2::uuid IS NULL OR form_submission_id=$2)
          AND ($3::uuid IS NULL OR form_draft_id=$3)
        ORDER BY created_at DESC LIMIT 200`,
      [tenantId, owner.submissionId ?? null, owner.draftId ?? null]);
    return rows;
  }
  async createAttachment(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_form_attachments
        (tenant_id, form_submission_id, form_draft_id, file_name, mime_type,
         size_bytes, storage_url, checksum, uploaded_by)
       VALUES ($1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9)
       RETURNING id::text, file_name, size_bytes`,
      [tenantId, body.form_submission_id ?? null, body.form_draft_id ?? null,
       body.file_name, body.mime_type, body.size_bytes, body.storage_url,
       body.checksum ?? null, userId]);
    return rows[0];
  }
  async deleteAttachment(tenantId: string, attachmentId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_form_attachments WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, attachmentId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Approval links ──────────────────────────────────────────
  async listApprovalLinks(tenantId: string, submissionId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, workflow_run_id::text AS workflow_run_id,
              approval_step_code, decision::text AS decision,
              decided_by, decided_at, comments, created_at
         FROM dos.ui_form_approval_links
        WHERE tenant_id=$1 AND form_submission_id=$2::uuid
        ORDER BY created_at`,
      [tenantId, submissionId]);
    return rows;
  }
  async upsertApprovalLink(tenantId: string, submissionId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_form_approval_links
        (tenant_id, form_submission_id, workflow_run_id, approval_step_code, decision)
       VALUES ($1,$2::uuid,$3::uuid,$4,COALESCE($5,'pending')::dos.ui_form_decision_t)
       ON CONFLICT (form_submission_id, approval_step_code) DO UPDATE
         SET workflow_run_id=EXCLUDED.workflow_run_id, updated_at=NOW()
       RETURNING id::text, approval_step_code, decision::text AS decision`,
      [tenantId, submissionId, body.workflow_run_id ?? null,
       body.approval_step_code, body.decision ?? null]);
    return rows[0];
  }
  async decideApproval(tenantId: string, linkId: string, userId: string, decision: 'approved' | 'rejected' | 'delegated' | 'escalated', comments?: string | null) {
    const { rows } = await this.pool.query(
      `UPDATE dos.ui_form_approval_links
          SET decision=$3::dos.ui_form_decision_t,
              decided_by=$4, decided_at=NOW(),
              comments=COALESCE($5, comments),
              updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid
        RETURNING id::text, decision::text AS decision, decided_by, decided_at`,
      [tenantId, linkId, decision, userId, comments ?? null]);
    return rows[0] ?? null;
  }
}
