import { randomBytes } from 'node:crypto';
/**
 * Wave 11p-§20 UI Manager Studio — manager covering 8 §20 tables (mig 0129+0130):
 * manager_projects, manager_drafts, manager_locks, manager_review_comments,
 * manager_validation_runs, manager_preview_sessions,
 * manager_import_jobs, manager_export_jobs.
 */
export class UiOsManagerStudioManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    // ── Projects ────────────────────────────────────────────────
    async listProjects(tenantId, activeOnly = false) {
        const { rows } = await this.pool.query(`SELECT id::text, project_key, name, description, owner_user_id, is_active,
              created_at, updated_at
         FROM dos.ui_manager_projects
        WHERE tenant_id=$1 AND ($2::boolean IS FALSE OR is_active=TRUE)
        ORDER BY name`, [tenantId, activeOnly]);
        return rows;
    }
    async getProject(tenantId, projectId) {
        const { rows } = await this.pool.query(`SELECT id::text, project_key, name, description, owner_user_id, is_active,
              created_at, updated_at
         FROM dos.ui_manager_projects
        WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1`, [tenantId, projectId]);
        return rows[0] ?? null;
    }
    async upsertProject(tenantId, ownerUserId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_manager_projects
        (tenant_id, project_key, name, description, owner_user_id, is_active)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,TRUE))
       ON CONFLICT (tenant_id, project_key) DO UPDATE
         SET name=EXCLUDED.name, description=EXCLUDED.description,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, project_key, name, is_active`, [tenantId, body.project_key, body.name, body.description ?? null,
            ownerUserId, body.is_active ?? null]);
        return rows[0];
    }
    async deleteProject(tenantId, projectId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_manager_projects WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, projectId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Drafts ──────────────────────────────────────────────────
    async listDrafts(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, project_id::text AS project_id,
              target_kind::text AS target_kind, target_id, state::text AS state,
              author_id, created_at, updated_at
         FROM dos.ui_manager_drafts
        WHERE tenant_id=$1
          AND ($2::uuid IS NULL OR project_id=$2::uuid)
          AND ($3::text IS NULL OR target_kind::text=$3)
          AND ($4::text IS NULL OR target_id=$4)
          AND ($5::text IS NULL OR state::text=$5)
        ORDER BY updated_at DESC`, [tenantId, opts.projectId ?? null, opts.targetKind ?? null,
            opts.targetId ?? null, opts.state ?? null]);
        return rows;
    }
    async getDraft(tenantId, draftId) {
        const { rows } = await this.pool.query(`SELECT id::text, project_id::text AS project_id,
              target_kind::text AS target_kind, target_id, payload,
              state::text AS state, author_id, created_at, updated_at
         FROM dos.ui_manager_drafts
        WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1`, [tenantId, draftId]);
        return rows[0] ?? null;
    }
    async createDraft(tenantId, authorId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_manager_drafts
        (tenant_id, project_id, target_kind, target_id, payload, state, author_id)
       VALUES ($1,$2::uuid,$3::dos.ui_target_kind_t,$4,
               COALESCE($5::jsonb,'{}'::jsonb),
               COALESCE($6,'draft')::dos.ui_manager_draft_state_t,$7)
       RETURNING id::text, state::text AS state, created_at`, [tenantId, body.project_id, body.target_kind, body.target_id,
            body.payload !== undefined ? JSON.stringify(body.payload) : null,
            body.state ?? null, authorId]);
        return rows[0];
    }
    async updateDraft(tenantId, draftId, body) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_manager_drafts
          SET payload=COALESCE($3::jsonb, payload),
              state=COALESCE($4::dos.ui_manager_draft_state_t, state),
              updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid
       RETURNING id::text, state::text AS state, updated_at`, [tenantId, draftId,
            body.payload !== undefined ? JSON.stringify(body.payload) : null,
            body.state ?? null]);
        return rows[0] ?? null;
    }
    async deleteDraft(tenantId, draftId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_manager_drafts WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, draftId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Locks ───────────────────────────────────────────────────
    async listActiveLocks(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, target_kind::text AS target_kind, target_id,
              locked_by_user_id, locked_at, expires_at
         FROM dos.ui_manager_locks
        WHERE tenant_id=$1 AND released_at IS NULL AND expires_at > NOW()
          AND ($2::text IS NULL OR target_kind::text=$2)
          AND ($3::text IS NULL OR target_id=$3)
        ORDER BY locked_at DESC`, [tenantId, opts.targetKind ?? null, opts.targetId ?? null]);
        return rows;
    }
    async acquireLock(tenantId, userId, body) {
        const ttlMin = Math.min(Math.max(body.ttl_minutes ?? 15, 1), 240);
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_manager_locks
        (tenant_id, target_kind, target_id, locked_by_user_id, expires_at)
       VALUES ($1,$2::dos.ui_target_kind_t,$3,$4, NOW() + ($5::int || ' minutes')::interval)
       RETURNING id::text, locked_at, expires_at`, [tenantId, body.target_kind, body.target_id, userId, ttlMin]);
        return rows[0];
    }
    async releaseLock(tenantId, lockId, userId) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_manager_locks
          SET released_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid AND locked_by_user_id=$3 AND released_at IS NULL
       RETURNING id::text, released_at`, [tenantId, lockId, userId]);
        return rows[0] ?? null;
    }
    // ── Review comments ─────────────────────────────────────────
    async listComments(tenantId, draftId) {
        const { rows } = await this.pool.query(`SELECT id::text, author_id, body, resolved, resolved_by, resolved_at, created_at
         FROM dos.ui_manager_review_comments
        WHERE tenant_id=$1 AND draft_id=$2::uuid
        ORDER BY created_at DESC`, [tenantId, draftId]);
        return rows;
    }
    async addComment(tenantId, draftId, authorId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_manager_review_comments
        (tenant_id, draft_id, author_id, body)
       VALUES ($1,$2::uuid,$3,$4)
       RETURNING id::text, created_at`, [tenantId, draftId, authorId, body.body]);
        return rows[0];
    }
    async resolveComment(tenantId, commentId, userId) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_manager_review_comments
          SET resolved=TRUE, resolved_by=$3, resolved_at=NOW(), updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid AND resolved=FALSE
       RETURNING id::text, resolved, resolved_at`, [tenantId, commentId, userId]);
        return rows[0] ?? null;
    }
    async deleteComment(tenantId, commentId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_manager_review_comments WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, commentId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Validation runs ─────────────────────────────────────────
    async recordValidationRun(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_manager_validation_runs
        (tenant_id, project_id, kind, passed, findings, validator_version)
       VALUES ($1,$2::uuid,$3,$4,COALESCE($5::jsonb,'[]'::jsonb),$6)
       RETURNING id::text, passed, ran_at`, [tenantId, body.project_id, body.kind, body.passed,
            body.findings !== undefined ? JSON.stringify(body.findings) : null,
            body.validator_version ?? null]);
        return rows[0];
    }
    async listValidationRuns(tenantId, projectId, limit = 100) {
        const { rows } = await this.pool.query(`SELECT id::text, kind, passed, findings, validator_version, ran_at
         FROM dos.ui_manager_validation_runs
        WHERE tenant_id=$1 AND project_id=$2::uuid
        ORDER BY ran_at DESC LIMIT $3`, [tenantId, projectId, Math.min(limit, 500)]);
        return rows;
    }
    // ── Preview sessions ────────────────────────────────────────
    async createPreviewSession(tenantId, userId, body) {
        const ttlMin = Math.min(Math.max(body.ttl_minutes ?? 60, 1), 1440);
        const token = randomBytes(32).toString('hex').slice(0, 64);
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_manager_preview_sessions
        (tenant_id, project_id, token, created_by_user_id, expires_at)
       VALUES ($1,$2::uuid,$3,$4, NOW() + ($5::int || ' minutes')::interval)
       RETURNING id::text, token, expires_at`, [tenantId, body.project_id, token, userId, ttlMin]);
        return rows[0];
    }
    async listPreviewSessions(tenantId, projectId) {
        const { rows } = await this.pool.query(`SELECT id::text, token, created_by_user_id, expires_at, revoked_at, created_at
         FROM dos.ui_manager_preview_sessions
        WHERE tenant_id=$1 AND project_id=$2::uuid
        ORDER BY created_at DESC`, [tenantId, projectId]);
        return rows;
    }
    async revokePreviewSession(tenantId, sessionId) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_manager_preview_sessions
          SET revoked_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid AND revoked_at IS NULL
       RETURNING id::text, revoked_at`, [tenantId, sessionId]);
        return rows[0] ?? null;
    }
    // ── Import jobs ─────────────────────────────────────────────
    async listImportJobs(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, project_id::text AS project_id, kind, source_url,
              status::text AS status, progress, error,
              started_at, completed_at, created_at
         FROM dos.ui_manager_import_jobs
        WHERE tenant_id=$1
          AND ($2::uuid IS NULL OR project_id=$2::uuid)
          AND ($3::text IS NULL OR status::text=$3)
        ORDER BY created_at DESC LIMIT $4`, [tenantId, opts.projectId ?? null, opts.status ?? null, Math.min(opts.limit ?? 100, 500)]);
        return rows;
    }
    async createImportJob(tenantId, createdBy, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_manager_import_jobs
        (tenant_id, project_id, kind, source_url, created_by)
       VALUES ($1,$2::uuid,$3,$4,$5)
       RETURNING id::text, status::text AS status, created_at`, [tenantId, body.project_id ?? null, body.kind, body.source_url ?? null, createdBy]);
        return rows[0];
    }
    async updateImportJob(tenantId, jobId, body) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_manager_import_jobs
          SET status=COALESCE($3::dos.ui_job_status_t, status),
              progress=COALESCE($4, progress),
              error=COALESCE($5::jsonb, error),
              started_at=COALESCE($6::timestamptz, started_at),
              completed_at=COALESCE($7::timestamptz, completed_at),
              updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid
       RETURNING id::text, status::text AS status, progress`, [tenantId, jobId, body.status ?? null, body.progress ?? null,
            body.error !== undefined ? JSON.stringify(body.error) : null,
            body.started_at ?? null, body.completed_at ?? null]);
        return rows[0] ?? null;
    }
    // ── Export jobs ─────────────────────────────────────────────
    async listExportJobs(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, project_id::text AS project_id, kind, target_format,
              download_url, status::text AS status, progress, error,
              started_at, completed_at, created_at
         FROM dos.ui_manager_export_jobs
        WHERE tenant_id=$1
          AND ($2::uuid IS NULL OR project_id=$2::uuid)
          AND ($3::text IS NULL OR status::text=$3)
        ORDER BY created_at DESC LIMIT $4`, [tenantId, opts.projectId ?? null, opts.status ?? null, Math.min(opts.limit ?? 100, 500)]);
        return rows;
    }
    async createExportJob(tenantId, createdBy, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_manager_export_jobs
        (tenant_id, project_id, kind, target_format, created_by)
       VALUES ($1,$2::uuid,$3,$4,$5)
       RETURNING id::text, status::text AS status, created_at`, [tenantId, body.project_id ?? null, body.kind, body.target_format, createdBy]);
        return rows[0];
    }
    async updateExportJob(tenantId, jobId, body) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_manager_export_jobs
          SET status=COALESCE($3::dos.ui_job_status_t, status),
              progress=COALESCE($4, progress),
              download_url=COALESCE($5, download_url),
              error=COALESCE($6::jsonb, error),
              started_at=COALESCE($7::timestamptz, started_at),
              completed_at=COALESCE($8::timestamptz, completed_at),
              updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid
       RETURNING id::text, status::text AS status, progress`, [tenantId, jobId, body.status ?? null, body.progress ?? null,
            body.download_url ?? null,
            body.error !== undefined ? JSON.stringify(body.error) : null,
            body.started_at ?? null, body.completed_at ?? null]);
        return rows[0] ?? null;
    }
}
//# sourceMappingURL=ui-os-manager-studio.manager.js.map