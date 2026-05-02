/**
 * Wave 11l-§16 Governance — manager covering 9 §16 tables (migrations
 * 0123+0124): change_log, publish_requests, publish_approvals,
 * published_versions, draft_versions, rollback_points,
 * schema_validation_results, contract_drift_results, admin_activity_log.
 */
export class UiOsGovernanceManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    // ── Change log ──────────────────────────────────────────────
    async recordChange(tenantId, actorId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_change_log
        (tenant_id, actor_id, target_kind, target_id, change_kind,
         before_state, after_state, reason)
       VALUES ($1,$2,$3::dos.ui_target_kind_t,$4,$5::dos.ui_change_kind_t,
               $6::jsonb,$7::jsonb,$8)
       RETURNING id::text, changed_at`, [tenantId, actorId, body.target_kind, body.target_id, body.change_kind,
            body.before_state !== undefined ? JSON.stringify(body.before_state) : null,
            body.after_state !== undefined ? JSON.stringify(body.after_state) : null,
            body.reason ?? null]);
        return rows[0];
    }
    async listChangeLog(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, actor_id, target_kind::text AS target_kind, target_id,
              change_kind::text AS change_kind, before_state, after_state,
              reason, changed_at
         FROM dos.ui_change_log
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR target_kind::text=$2)
          AND ($3::text IS NULL OR target_id=$3)
          AND ($4::text IS NULL OR actor_id=$4)
        ORDER BY changed_at DESC LIMIT $5`, [tenantId, opts.targetKind ?? null, opts.targetId ?? null,
            opts.actorId ?? null, Math.min(opts.limit ?? 200, 500)]);
        return rows;
    }
    // ── Publish requests ────────────────────────────────────────
    async listPublishRequests(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, target_kind::text AS target_kind, target_id,
              draft_version_id::text AS draft_version_id, requester_id,
              summary, status::text AS status, requested_at, resolved_at
         FROM dos.ui_publish_requests
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR status::text=$2)
          AND ($3::text IS NULL OR target_kind::text=$3)
          AND ($4::text IS NULL OR target_id=$4)
        ORDER BY requested_at DESC`, [tenantId, opts.status ?? null, opts.targetKind ?? null, opts.targetId ?? null]);
        return rows;
    }
    async createPublishRequest(tenantId, requesterId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_publish_requests
        (tenant_id, target_kind, target_id, draft_version_id, requester_id, summary)
       VALUES ($1,$2::dos.ui_target_kind_t,$3,$4::uuid,$5,$6)
       RETURNING id::text, status::text AS status, requested_at`, [tenantId, body.target_kind, body.target_id,
            body.draft_version_id ?? null, requesterId, body.summary ?? null]);
        return rows[0];
    }
    async resolvePublishRequest(tenantId, requestId, status) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_publish_requests
          SET status=$3::dos.ui_publish_status_t, resolved_at=NOW(), updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid
       RETURNING id::text, status::text AS status, resolved_at`, [tenantId, requestId, status]);
        return rows[0] ?? null;
    }
    // ── Publish approvals ───────────────────────────────────────
    async listApprovals(tenantId, requestId) {
        const { rows } = await this.pool.query(`SELECT id::text, approver_id, decision::text AS decision, note, decided_at
         FROM dos.ui_publish_approvals
        WHERE tenant_id=$1 AND publish_request_id=$2::uuid
        ORDER BY created_at`, [tenantId, requestId]);
        return rows;
    }
    async upsertApproval(tenantId, requestId, approverId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_publish_approvals
        (tenant_id, publish_request_id, approver_id, decision, note, decided_at)
       VALUES ($1,$2::uuid,$3,COALESCE($4,'pending')::dos.ui_form_decision_t,$5,
               CASE WHEN COALESCE($4,'pending')='pending' THEN NULL ELSE NOW() END)
       ON CONFLICT (publish_request_id, approver_id) DO UPDATE
         SET decision=EXCLUDED.decision, note=EXCLUDED.note,
             decided_at=CASE WHEN EXCLUDED.decision='pending' THEN NULL ELSE NOW() END,
             updated_at=NOW()
       RETURNING id::text, approver_id, decision::text AS decision, decided_at`, [tenantId, requestId, approverId, body.decision ?? null, body.note ?? null]);
        return rows[0];
    }
    // ── Published versions ──────────────────────────────────────
    async listPublishedVersions(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, target_kind::text AS target_kind, target_id, version,
              published_by, published_at, is_current
         FROM dos.ui_published_versions
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR target_kind::text=$2)
          AND ($3::text IS NULL OR target_id=$3)
          AND ($4::boolean IS FALSE OR is_current=TRUE)
        ORDER BY published_at DESC`, [tenantId, opts.targetKind ?? null, opts.targetId ?? null, !!opts.currentOnly]);
        return rows;
    }
    async getPublishedVersion(tenantId, versionId) {
        const { rows } = await this.pool.query(`SELECT id::text, target_kind::text AS target_kind, target_id, version,
              payload, published_by, published_at, is_current
         FROM dos.ui_published_versions
        WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1`, [tenantId, versionId]);
        return rows[0] ?? null;
    }
    async publishVersion(tenantId, publishedBy, body) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`UPDATE dos.ui_published_versions SET is_current=FALSE
          WHERE tenant_id=$1 AND target_kind=$2::dos.ui_target_kind_t AND target_id=$3 AND is_current=TRUE`, [tenantId, body.target_kind, body.target_id]);
            const { rows } = await client.query(`INSERT INTO dos.ui_published_versions
          (tenant_id, target_kind, target_id, version, payload, published_by, is_current)
         VALUES ($1,$2::dos.ui_target_kind_t,$3,$4,COALESCE($5::jsonb,'{}'::jsonb),$6,TRUE)
         RETURNING id::text, version, is_current, published_at`, [tenantId, body.target_kind, body.target_id, body.version,
                body.payload !== undefined ? JSON.stringify(body.payload) : null,
                publishedBy]);
            await client.query('COMMIT');
            return rows[0];
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    // ── Draft versions ──────────────────────────────────────────
    async listDrafts(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, target_kind::text AS target_kind, target_id, version,
              author_id, is_active, created_at, updated_at
         FROM dos.ui_draft_versions
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR target_kind::text=$2)
          AND ($3::text IS NULL OR target_id=$3)
          AND ($4::boolean IS FALSE OR is_active=TRUE)
        ORDER BY updated_at DESC`, [tenantId, opts.targetKind ?? null, opts.targetId ?? null, !!opts.activeOnly]);
        return rows;
    }
    async getDraft(tenantId, draftId) {
        const { rows } = await this.pool.query(`SELECT id::text, target_kind::text AS target_kind, target_id, version,
              payload, author_id, is_active, created_at, updated_at
         FROM dos.ui_draft_versions
        WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1`, [tenantId, draftId]);
        return rows[0] ?? null;
    }
    async upsertDraft(tenantId, authorId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_draft_versions
        (tenant_id, target_kind, target_id, version, payload, author_id, is_active)
       VALUES ($1,$2::dos.ui_target_kind_t,$3,$4,COALESCE($5::jsonb,'{}'::jsonb),$6,COALESCE($7,TRUE))
       ON CONFLICT (tenant_id, target_kind, target_id, version) DO UPDATE
         SET payload=EXCLUDED.payload, author_id=EXCLUDED.author_id,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, version, is_active, updated_at`, [tenantId, body.target_kind, body.target_id, body.version,
            body.payload !== undefined ? JSON.stringify(body.payload) : null,
            authorId, body.is_active ?? null]);
        return rows[0];
    }
    async deleteDraft(tenantId, draftId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_draft_versions WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, draftId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Rollback points ─────────────────────────────────────────
    async listRollbackPoints(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, target_kind::text AS target_kind, target_id, version,
              reason, created_by, created_at
         FROM dos.ui_rollback_points
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR target_kind::text=$2)
          AND ($3::text IS NULL OR target_id=$3)
        ORDER BY created_at DESC`, [tenantId, opts.targetKind ?? null, opts.targetId ?? null]);
        return rows;
    }
    async createRollbackPoint(tenantId, createdBy, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_rollback_points
        (tenant_id, target_kind, target_id, version, payload, reason, created_by)
       VALUES ($1,$2::dos.ui_target_kind_t,$3,$4,COALESCE($5::jsonb,'{}'::jsonb),$6,$7)
       RETURNING id::text, version, created_at`, [tenantId, body.target_kind, body.target_id, body.version,
            body.payload !== undefined ? JSON.stringify(body.payload) : null,
            body.reason ?? null, createdBy]);
        return rows[0];
    }
    async getRollbackPoint(tenantId, pointId) {
        const { rows } = await this.pool.query(`SELECT id::text, target_kind::text AS target_kind, target_id, version,
              payload, reason, created_by, created_at
         FROM dos.ui_rollback_points
        WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1`, [tenantId, pointId]);
        return rows[0] ?? null;
    }
    // ── Schema validation results ───────────────────────────────
    async recordSchemaValidation(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_schema_validation_results
        (tenant_id, subject_kind, subject_id, passed, findings, validator_version)
       VALUES ($1,$2::dos.ui_target_kind_t,$3,$4,COALESCE($5::jsonb,'[]'::jsonb),$6)
       RETURNING id::text, passed, validated_at`, [tenantId, body.subject_kind, body.subject_id, body.passed,
            body.findings !== undefined ? JSON.stringify(body.findings) : null,
            body.validator_version ?? null]);
        return rows[0];
    }
    async listSchemaValidations(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, subject_kind::text AS subject_kind, subject_id, passed,
              findings, validator_version, validated_at
         FROM dos.ui_schema_validation_results
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR subject_kind::text=$2)
          AND ($3::text IS NULL OR subject_id=$3)
        ORDER BY validated_at DESC LIMIT $4`, [tenantId, opts.subjectKind ?? null, opts.subjectId ?? null,
            Math.min(opts.limit ?? 100, 500)]);
        return rows;
    }
    // ── Contract drift results ──────────────────────────────────
    async recordDrift(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_contract_drift_results
        (tenant_id, subject_kind, subject_id, drift_kind, delta)
       VALUES ($1,$2::dos.ui_target_kind_t,$3,$4,COALESCE($5::jsonb,'{}'::jsonb))
       RETURNING id::text, drift_kind, detected_at`, [tenantId, body.subject_kind, body.subject_id, body.drift_kind,
            body.delta !== undefined ? JSON.stringify(body.delta) : null]);
        return rows[0];
    }
    async listDrift(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, subject_kind::text AS subject_kind, subject_id,
              drift_kind, delta, detected_at, resolved_at
         FROM dos.ui_contract_drift_results
        WHERE tenant_id=$1
          AND ($2::boolean IS FALSE OR resolved_at IS NULL)
        ORDER BY detected_at DESC LIMIT $3`, [tenantId, !!opts.openOnly, Math.min(opts.limit ?? 100, 500)]);
        return rows;
    }
    async resolveDrift(tenantId, driftId) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_contract_drift_results
          SET resolved_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid AND resolved_at IS NULL
       RETURNING id::text, resolved_at`, [tenantId, driftId]);
        return rows[0] ?? null;
    }
    // ── Admin activity log ──────────────────────────────────────
    async recordAdminActivity(tenantId, actorId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_admin_activity_log
        (tenant_id, actor_id, action_code, target_kind, target_id, payload)
       VALUES ($1,$2,$3,$4::dos.ui_target_kind_t,$5,COALESCE($6::jsonb,'{}'::jsonb))
       RETURNING id::text, occurred_at`, [tenantId, actorId, body.action_code, body.target_kind ?? null,
            body.target_id ?? null,
            body.payload !== undefined ? JSON.stringify(body.payload) : null]);
        return rows[0];
    }
    async listAdminActivity(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, actor_id, action_code, target_kind::text AS target_kind,
              target_id, payload, occurred_at
         FROM dos.ui_admin_activity_log
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR actor_id=$2)
          AND ($3::text IS NULL OR action_code=$3)
        ORDER BY occurred_at DESC LIMIT $4`, [tenantId, opts.actorId ?? null, opts.actionCode ?? null,
            Math.min(opts.limit ?? 200, 500)]);
        return rows;
    }
}
//# sourceMappingURL=ui-os-governance.manager.js.map