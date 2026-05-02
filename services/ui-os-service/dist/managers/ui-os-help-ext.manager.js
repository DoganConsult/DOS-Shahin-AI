/**
 * Wave 11f-§10 Help/Onboarding — manager covering 10 §10 tables (migrations
 * 20260502_0113 + 0114): help_articles, help_collections,
 * help_collection_articles, contextual_help_links, empty_state_content,
 * checklists, checklist_steps, user_checklist_progress, release_notes,
 * user_release_notes_read.
 */
export class UiOsHelpExtManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    // ── Help articles ───────────────────────────────────────────
    async listArticles(tenantId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, slug, locale, title_key, module_code, product_code,
              is_active, published_at, updated_at
         FROM dos.ui_help_articles
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR locale=$2)
          AND ($3::text IS NULL OR module_code=$3)
        ORDER BY slug, locale`, [tenantId, opts.locale ?? null, opts.moduleCode ?? null]);
        return rows;
    }
    async getArticle(tenantId, slug, locale) {
        const { rows } = await this.pool.query(`SELECT id::text, slug, locale, title_key, body_md, module_code, product_code,
              is_active, published_at, created_at, updated_at
         FROM dos.ui_help_articles
        WHERE tenant_id=$1 AND slug=$2 AND locale=$3 LIMIT 1`, [tenantId, slug, locale]);
        return rows[0] ?? null;
    }
    async upsertArticle(tenantId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_help_articles
        (tenant_id, slug, locale, title_key, body_md, module_code, product_code,
         is_active, published_at, created_by, updated_by)
       VALUES ($1,$2,COALESCE($3,'en'),$4,$5,$6,$7,COALESCE($8,TRUE),$9::timestamptz,$10,$10)
       ON CONFLICT (tenant_id, slug, locale) DO UPDATE
         SET title_key=EXCLUDED.title_key,
             body_md=EXCLUDED.body_md,
             module_code=EXCLUDED.module_code,
             product_code=EXCLUDED.product_code,
             is_active=EXCLUDED.is_active,
             published_at=EXCLUDED.published_at,
             updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, slug, locale, is_active`, [tenantId, body.slug, body.locale ?? null, body.title_key ?? null,
            body.body_md, body.module_code ?? null, body.product_code ?? null,
            body.is_active ?? null, body.published_at ?? null, userId]);
        return rows[0];
    }
    async deleteArticle(tenantId, articleId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_help_articles WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, articleId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Help collections ────────────────────────────────────────
    async listCollections(tenantId) {
        const { rows } = await this.pool.query(`SELECT id::text, collection_key, title_key, description_key,
              display_order, is_active
         FROM dos.ui_help_collections
        WHERE tenant_id=$1 ORDER BY display_order, collection_key`, [tenantId]);
        return rows;
    }
    async upsertCollection(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_help_collections
        (tenant_id, collection_key, title_key, description_key, display_order, is_active)
       VALUES ($1,$2,$3,$4,COALESCE($5,0),COALESCE($6,TRUE))
       ON CONFLICT (tenant_id, collection_key) DO UPDATE
         SET title_key=EXCLUDED.title_key,
             description_key=EXCLUDED.description_key,
             display_order=EXCLUDED.display_order,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, collection_key, display_order, is_active`, [tenantId, body.collection_key, body.title_key ?? null,
            body.description_key ?? null, body.display_order ?? null, body.is_active ?? null]);
        return rows[0];
    }
    async deleteCollection(tenantId, collectionId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_help_collections WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, collectionId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Collection ↔ article bindings ───────────────────────────
    async listCollectionArticles(tenantId, collectionId) {
        const { rows } = await this.pool.query(`SELECT ca.id::text, ca.article_id::text AS article_id, ca.display_order,
              a.slug, a.locale, a.title_key
         FROM dos.ui_help_collection_articles ca
         JOIN dos.ui_help_articles a ON a.id=ca.article_id
        WHERE ca.tenant_id=$1 AND ca.collection_id=$2::uuid
        ORDER BY ca.display_order, a.slug`, [tenantId, collectionId]);
        return rows;
    }
    async addCollectionArticle(tenantId, collectionId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_help_collection_articles
        (tenant_id, collection_id, article_id, display_order)
       VALUES ($1,$2::uuid,$3::uuid,COALESCE($4,0))
       ON CONFLICT (collection_id, article_id) DO UPDATE
         SET display_order=EXCLUDED.display_order
       RETURNING id::text, article_id::text AS article_id, display_order`, [tenantId, collectionId, body.article_id, body.display_order ?? null]);
        return rows[0];
    }
    async removeCollectionArticle(tenantId, bindingId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_help_collection_articles WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, bindingId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Contextual help links ───────────────────────────────────
    async listContextualLinks(tenantId, surfaceKey) {
        const { rows } = await this.pool.query(`SELECT l.id::text, l.surface_key, l.help_article_id::text AS help_article_id,
              l.display_kind::text AS display_kind, l.display_order, l.is_active,
              a.slug, a.locale, a.title_key
         FROM dos.ui_contextual_help_links l
         JOIN dos.ui_help_articles a ON a.id=l.help_article_id
        WHERE l.tenant_id=$1
          AND ($2::text IS NULL OR l.surface_key=$2)
        ORDER BY l.surface_key, l.display_order`, [tenantId, surfaceKey ?? null]);
        return rows;
    }
    async upsertContextualLink(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_contextual_help_links
        (tenant_id, surface_key, help_article_id, display_kind, display_order, is_active)
       VALUES ($1,$2,$3::uuid,COALESCE($4,'tooltip')::dos.ui_contextual_help_display_t,
               COALESCE($5,0),COALESCE($6,TRUE))
       ON CONFLICT (tenant_id, surface_key, help_article_id) DO UPDATE
         SET display_kind=EXCLUDED.display_kind,
             display_order=EXCLUDED.display_order,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, surface_key, display_kind::text AS display_kind`, [tenantId, body.surface_key, body.help_article_id, body.display_kind ?? null,
            body.display_order ?? null, body.is_active ?? null]);
        return rows[0];
    }
    async deleteContextualLink(tenantId, linkId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_contextual_help_links WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, linkId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Empty-state content ─────────────────────────────────────
    async listEmptyStates(tenantId) {
        const { rows } = await this.pool.query(`SELECT id::text, surface_key, title_key, body_key,
              cta_action_code, illustration_key, is_active
         FROM dos.ui_empty_state_content
        WHERE tenant_id=$1 ORDER BY surface_key`, [tenantId]);
        return rows;
    }
    async upsertEmptyState(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_empty_state_content
        (tenant_id, surface_key, title_key, body_key, cta_action_code, illustration_key, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,TRUE))
       ON CONFLICT (tenant_id, surface_key) DO UPDATE
         SET title_key=EXCLUDED.title_key,
             body_key=EXCLUDED.body_key,
             cta_action_code=EXCLUDED.cta_action_code,
             illustration_key=EXCLUDED.illustration_key,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, surface_key, is_active`, [tenantId, body.surface_key, body.title_key ?? null, body.body_key ?? null,
            body.cta_action_code ?? null, body.illustration_key ?? null, body.is_active ?? null]);
        return rows[0];
    }
    // ── Checklists ──────────────────────────────────────────────
    async listChecklists(tenantId, audience) {
        const { rows } = await this.pool.query(`SELECT id::text, checklist_key, audience, title_key, description_key, is_active
         FROM dos.ui_checklists
        WHERE tenant_id=$1 AND ($2::text IS NULL OR audience=$2)
        ORDER BY checklist_key`, [tenantId, audience ?? null]);
        return rows;
    }
    async upsertChecklist(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_checklists
        (tenant_id, checklist_key, audience, title_key, description_key, is_active)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,TRUE))
       ON CONFLICT (tenant_id, checklist_key) DO UPDATE
         SET audience=EXCLUDED.audience,
             title_key=EXCLUDED.title_key,
             description_key=EXCLUDED.description_key,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, checklist_key, audience, is_active`, [tenantId, body.checklist_key, body.audience, body.title_key ?? null,
            body.description_key ?? null, body.is_active ?? null]);
        return rows[0];
    }
    async deleteChecklist(tenantId, checklistId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_checklists WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, checklistId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Checklist steps ─────────────────────────────────────────
    async listSteps(tenantId, checklistId) {
        const { rows } = await this.pool.query(`SELECT id::text, step_key, display_order, title_key, description_key,
              cta_action_code, is_required, is_active
         FROM dos.ui_checklist_steps
        WHERE tenant_id=$1 AND checklist_id=$2::uuid
        ORDER BY display_order, step_key`, [tenantId, checklistId]);
        return rows;
    }
    async upsertStep(tenantId, checklistId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_checklist_steps
        (tenant_id, checklist_id, step_key, display_order, title_key, description_key,
         cta_action_code, is_required, is_active)
       VALUES ($1,$2::uuid,$3,COALESCE($4,0),$5,$6,$7,COALESCE($8,TRUE),COALESCE($9,TRUE))
       ON CONFLICT (checklist_id, step_key) DO UPDATE
         SET display_order=EXCLUDED.display_order,
             title_key=EXCLUDED.title_key,
             description_key=EXCLUDED.description_key,
             cta_action_code=EXCLUDED.cta_action_code,
             is_required=EXCLUDED.is_required,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, step_key, display_order, is_active`, [tenantId, checklistId, body.step_key, body.display_order ?? null,
            body.title_key ?? null, body.description_key ?? null,
            body.cta_action_code ?? null, body.is_required ?? null, body.is_active ?? null]);
        return rows[0];
    }
    async deleteStep(tenantId, stepId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_checklist_steps WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, stepId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── User checklist progress ─────────────────────────────────
    async getProgress(tenantId, userId, checklistId) {
        const { rows } = await this.pool.query(`SELECT p.id::text, p.step_id::text AS step_id, s.step_key,
              p.status::text AS status, p.completed_at, p.updated_at
         FROM dos.ui_user_checklist_progress p
         JOIN dos.ui_checklist_steps s ON s.id=p.step_id
        WHERE p.tenant_id=$1 AND p.user_id=$2 AND p.checklist_id=$3::uuid
        ORDER BY s.display_order, s.step_key`, [tenantId, userId, checklistId]);
        return rows;
    }
    async setStepStatus(tenantId, userId, checklistId, stepId, status) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_user_checklist_progress
        (tenant_id, checklist_id, user_id, step_id, status, completed_at)
       VALUES ($1,$2::uuid,$3,$4::uuid,$5::dos.ui_checklist_step_status_t,
               CASE WHEN $5='completed' THEN NOW() ELSE NULL END)
       ON CONFLICT (user_id, step_id) DO UPDATE
         SET status=EXCLUDED.status,
             completed_at=CASE WHEN EXCLUDED.status='completed' THEN NOW()
                                ELSE dos.ui_user_checklist_progress.completed_at END,
             updated_at=NOW()
       RETURNING id::text, status::text AS status, completed_at`, [tenantId, checklistId, userId, stepId, status]);
        return rows[0];
    }
    // ── Release notes ───────────────────────────────────────────
    async listReleaseNotes(tenantId, locale, limit = 50) {
        const { rows } = await this.pool.query(`SELECT id::text, version, locale, published_at, title_key, is_active
         FROM dos.ui_release_notes
        WHERE tenant_id=$1 AND ($2::text IS NULL OR locale=$2)
        ORDER BY published_at DESC LIMIT $3`, [tenantId, locale ?? null, Math.min(limit, 200)]);
        return rows;
    }
    async getReleaseNote(tenantId, version, locale) {
        const { rows } = await this.pool.query(`SELECT id::text, version, locale, published_at, title_key, body_md, is_active
         FROM dos.ui_release_notes
        WHERE tenant_id=$1 AND version=$2 AND locale=$3 LIMIT 1`, [tenantId, version, locale]);
        return rows[0] ?? null;
    }
    async upsertReleaseNote(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_release_notes
        (tenant_id, version, locale, published_at, title_key, body_md, is_active)
       VALUES ($1,$2,COALESCE($3,'en'),COALESCE($4::timestamptz,NOW()),
               $5,$6,COALESCE($7,TRUE))
       ON CONFLICT (tenant_id, version, locale) DO UPDATE
         SET published_at=EXCLUDED.published_at,
             title_key=EXCLUDED.title_key,
             body_md=EXCLUDED.body_md,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, version, locale, published_at`, [tenantId, body.version, body.locale ?? null, body.published_at ?? null,
            body.title_key ?? null, body.body_md, body.is_active ?? null]);
        return rows[0];
    }
    async markReleaseNoteRead(tenantId, userId, releaseNoteId) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_user_release_notes_read (tenant_id, release_note_id, user_id)
       VALUES ($1, $2::uuid, $3)
       ON CONFLICT (release_note_id, user_id) DO UPDATE SET read_at=NOW()
       RETURNING id::text, read_at`, [tenantId, releaseNoteId, userId]);
        return rows[0];
    }
    async listUnreadReleaseNotes(tenantId, userId, locale) {
        const { rows } = await this.pool.query(`SELECT n.id::text, n.version, n.locale, n.published_at, n.title_key
         FROM dos.ui_release_notes n
         LEFT JOIN dos.ui_user_release_notes_read r
           ON r.release_note_id=n.id AND r.user_id=$2
        WHERE n.tenant_id=$1 AND n.locale=$3 AND n.is_active=TRUE
          AND r.id IS NULL
        ORDER BY n.published_at DESC LIMIT 50`, [tenantId, userId, locale]);
        return rows;
    }
}
//# sourceMappingURL=ui-os-help-ext.manager.js.map