/**
 * Wave 11o-§19 AI Workspace — manager covering 8 §19 tables (mig 0128):
 * ai_context_panels, ai_suggestions, ai_suggestion_feedback,
 * ai_action_drafts, ai_workspace_memory, ai_prompt_templates,
 * ai_prompt_template_tools, ai_tool_surface_bindings.
 */
export class UiOsAiWorkspaceManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    // ── Context panels ──────────────────────────────────────────
    async listPanels(tenantId) {
        const { rows } = await this.pool.query(`SELECT id::text, route_key, position::text AS position, default_open,
              config, is_active
         FROM dos.ui_ai_context_panels
        WHERE tenant_id=$1 ORDER BY route_key`, [tenantId]);
        return rows;
    }
    async getPanelByRoute(tenantId, routeKey) {
        const { rows } = await this.pool.query(`SELECT id::text, route_key, position::text AS position, default_open,
              config, is_active
         FROM dos.ui_ai_context_panels
        WHERE tenant_id=$1 AND route_key=$2 LIMIT 1`, [tenantId, routeKey]);
        return rows[0] ?? null;
    }
    async upsertPanel(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_ai_context_panels
        (tenant_id, route_key, position, default_open, config, is_active)
       VALUES ($1,$2,COALESCE($3,'right')::dos.ui_ai_panel_position_t,
               COALESCE($4,FALSE),COALESCE($5::jsonb,'{}'::jsonb),COALESCE($6,TRUE))
       ON CONFLICT (tenant_id, route_key) DO UPDATE
         SET position=EXCLUDED.position, default_open=EXCLUDED.default_open,
             config=EXCLUDED.config, is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, route_key, position::text AS position, default_open`, [tenantId, body.route_key, body.position ?? null, body.default_open ?? null,
            body.config !== undefined ? JSON.stringify(body.config) : null,
            body.is_active ?? null]);
        return rows[0];
    }
    async deletePanel(tenantId, panelId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_ai_context_panels WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, panelId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Suggestions ─────────────────────────────────────────────
    async recordSuggestion(tenantId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_ai_suggestions
        (tenant_id, user_id, surface_key, suggestion_kind, payload)
       VALUES ($1,$2,$3,$4,COALESCE($5::jsonb,'{}'::jsonb))
       RETURNING id::text, shown_at`, [tenantId, userId, body.surface_key, body.suggestion_kind,
            body.payload !== undefined ? JSON.stringify(body.payload) : null]);
        return rows[0];
    }
    async listSuggestions(tenantId, userId, limit = 50) {
        const { rows } = await this.pool.query(`SELECT id::text, surface_key, suggestion_kind, payload, shown_at
         FROM dos.ui_ai_suggestions
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY shown_at DESC LIMIT $3`, [tenantId, userId, Math.min(limit, 200)]);
        return rows;
    }
    // ── Suggestion feedback ─────────────────────────────────────
    async recordFeedback(tenantId, suggestionId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_ai_suggestion_feedback
        (tenant_id, suggestion_id, user_id, decision, comment)
       VALUES ($1,$2::uuid,$3,$4::dos.ui_form_decision_t,$5)
       ON CONFLICT (suggestion_id, user_id) DO UPDATE
         SET decision=EXCLUDED.decision, comment=EXCLUDED.comment, decided_at=NOW()
       RETURNING id::text, decision::text AS decision, decided_at`, [tenantId, suggestionId, userId, body.decision, body.comment ?? null]);
        return rows[0];
    }
    async listFeedback(tenantId, suggestionId) {
        const { rows } = await this.pool.query(`SELECT id::text, user_id, decision::text AS decision, comment, decided_at
         FROM dos.ui_ai_suggestion_feedback
        WHERE tenant_id=$1 AND suggestion_id=$2::uuid
        ORDER BY decided_at DESC`, [tenantId, suggestionId]);
        return rows;
    }
    // ── Action drafts ───────────────────────────────────────────
    async listDrafts(tenantId, userId, opts) {
        const { rows } = await this.pool.query(`SELECT id::text, action_code, params, state::text AS state,
              linked_engine_draft_id::text AS linked_engine_draft_id,
              created_at, updated_at
         FROM dos.ui_ai_action_drafts
        WHERE tenant_id=$1 AND user_id=$2
          AND ($3::text IS NULL OR state::text=$3)
        ORDER BY created_at DESC LIMIT $4`, [tenantId, userId, opts.state ?? null, Math.min(opts.limit ?? 100, 500)]);
        return rows;
    }
    async getDraft(tenantId, draftId) {
        const { rows } = await this.pool.query(`SELECT id::text, user_id, action_code, params, state::text AS state,
              linked_engine_draft_id::text AS linked_engine_draft_id,
              created_at, updated_at
         FROM dos.ui_ai_action_drafts
        WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1`, [tenantId, draftId]);
        return rows[0] ?? null;
    }
    async createDraft(tenantId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_ai_action_drafts
        (tenant_id, user_id, action_code, params, state, linked_engine_draft_id)
       VALUES ($1,$2,$3,COALESCE($4::jsonb,'{}'::jsonb),
               COALESCE($5,'pending')::dos.ui_ai_action_draft_state_t,$6::uuid)
       RETURNING id::text, action_code, state::text AS state, created_at`, [tenantId, userId, body.action_code,
            body.params !== undefined ? JSON.stringify(body.params) : null,
            body.state ?? null, body.linked_engine_draft_id ?? null]);
        return rows[0];
    }
    async updateDraftState(tenantId, draftId, state) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_ai_action_drafts
          SET state=$3::dos.ui_ai_action_draft_state_t, updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2::uuid
       RETURNING id::text, state::text AS state, updated_at`, [tenantId, draftId, state]);
        return rows[0] ?? null;
    }
    async deleteDraft(tenantId, draftId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_ai_action_drafts WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, draftId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Workspace memory ────────────────────────────────────────
    async getMemory(tenantId, userId, memoryKey) {
        const { rows } = await this.pool.query(`SELECT id::text, memory_key, value, expires_at, created_at, updated_at
         FROM dos.ui_ai_workspace_memory
        WHERE tenant_id=$1 AND user_id=$2 AND memory_key=$3
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1`, [tenantId, userId, memoryKey]);
        return rows[0] ?? null;
    }
    async listMemory(tenantId, userId) {
        const { rows } = await this.pool.query(`SELECT id::text, memory_key, value, expires_at, updated_at
         FROM dos.ui_ai_workspace_memory
        WHERE tenant_id=$1 AND user_id=$2
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY memory_key`, [tenantId, userId]);
        return rows;
    }
    async upsertMemory(tenantId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_ai_workspace_memory
        (tenant_id, user_id, memory_key, value, expires_at)
       VALUES ($1,$2,$3,COALESCE($4::jsonb,'{}'::jsonb),$5::timestamptz)
       ON CONFLICT (tenant_id, user_id, memory_key) DO UPDATE
         SET value=EXCLUDED.value, expires_at=EXCLUDED.expires_at, updated_at=NOW()
       RETURNING id::text, memory_key, expires_at, updated_at`, [tenantId, userId, body.memory_key,
            body.value !== undefined ? JSON.stringify(body.value) : null,
            body.expires_at ?? null]);
        return rows[0];
    }
    async deleteMemory(tenantId, userId, memoryKey) {
        const r = await this.pool.query(`DELETE FROM dos.ui_ai_workspace_memory
        WHERE tenant_id=$1 AND user_id=$2 AND memory_key=$3`, [tenantId, userId, memoryKey]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Prompt templates ────────────────────────────────────────
    async listPromptTemplates(tenantId, activeOnly = false) {
        const { rows } = await this.pool.query(`SELECT id::text, template_key, body, model_hint, description_key, is_active
         FROM dos.ui_ai_prompt_templates
        WHERE tenant_id=$1 AND ($2::boolean IS FALSE OR is_active=TRUE)
        ORDER BY template_key`, [tenantId, activeOnly]);
        return rows;
    }
    async getPromptTemplate(tenantId, templateId) {
        const { rows } = await this.pool.query(`SELECT id::text, template_key, body, model_hint, description_key, is_active,
              created_by, updated_by, created_at, updated_at
         FROM dos.ui_ai_prompt_templates
        WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1`, [tenantId, templateId]);
        return rows[0] ?? null;
    }
    async upsertPromptTemplate(tenantId, actorId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_ai_prompt_templates
        (tenant_id, template_key, body, model_hint, description_key, is_active,
         created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,TRUE),$7,$7)
       ON CONFLICT (tenant_id, template_key) DO UPDATE
         SET body=EXCLUDED.body, model_hint=EXCLUDED.model_hint,
             description_key=EXCLUDED.description_key,
             is_active=EXCLUDED.is_active,
             updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, template_key, is_active`, [tenantId, body.template_key, body.body, body.model_hint ?? null,
            body.description_key ?? null, body.is_active ?? null, actorId]);
        return rows[0];
    }
    async deletePromptTemplate(tenantId, templateId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_ai_prompt_templates WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, templateId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Prompt template tools ───────────────────────────────────
    async listTemplateTools(tenantId, templateId) {
        const { rows } = await this.pool.query(`SELECT id::text, tool_code, display_order
         FROM dos.ui_ai_prompt_template_tools
        WHERE tenant_id=$1 AND prompt_template_id=$2::uuid
        ORDER BY display_order, tool_code`, [tenantId, templateId]);
        return rows;
    }
    async upsertTemplateTool(tenantId, templateId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_ai_prompt_template_tools
        (tenant_id, prompt_template_id, tool_code, display_order)
       VALUES ($1,$2::uuid,$3,COALESCE($4,0))
       ON CONFLICT (prompt_template_id, tool_code) DO UPDATE
         SET display_order=EXCLUDED.display_order
       RETURNING id::text, tool_code, display_order`, [tenantId, templateId, body.tool_code, body.display_order ?? null]);
        return rows[0];
    }
    async deleteTemplateTool(tenantId, toolBindingId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_ai_prompt_template_tools WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, toolBindingId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── Tool surface bindings ───────────────────────────────────
    async listToolSurfaceBindings(tenantId, surfaceKey) {
        const { rows } = await this.pool.query(`SELECT id::text, surface_key, tool_code, effect::text AS effect, is_active
         FROM dos.ui_ai_tool_surface_bindings
        WHERE tenant_id=$1 AND ($2::text IS NULL OR surface_key=$2)
        ORDER BY surface_key, tool_code`, [tenantId, surfaceKey ?? null]);
        return rows;
    }
    async upsertToolSurfaceBinding(tenantId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_ai_tool_surface_bindings
        (tenant_id, surface_key, tool_code, effect, is_active)
       VALUES ($1,$2,$3,COALESCE($4,'allow')::dos.ui_perm_effect_t,COALESCE($5,TRUE))
       ON CONFLICT (tenant_id, surface_key, tool_code) DO UPDATE
         SET effect=EXCLUDED.effect, is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, surface_key, tool_code, effect::text AS effect`, [tenantId, body.surface_key, body.tool_code,
            body.effect ?? null, body.is_active ?? null]);
        return rows[0];
    }
    async deleteToolSurfaceBinding(tenantId, bindingId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_ai_tool_surface_bindings WHERE tenant_id=$1 AND id=$2::uuid`, [tenantId, bindingId]);
        return (r.rowCount ?? 0) > 0;
    }
}
//# sourceMappingURL=ui-os-ai-workspace.manager.js.map