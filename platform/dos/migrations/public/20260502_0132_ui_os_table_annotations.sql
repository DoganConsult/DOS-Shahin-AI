-- =====================================================================
-- UI-OS — table annotations for §19 AI Workspace + §20 Manager Studio
-- (20260502_0132)
--
-- Adds COMMENT ON TABLE for the 20 highest-traffic UI-OS tables that
-- back the renderers and Manager Studio admin UI. These comments are
-- consumed by:
--   - pgAdmin / DBeaver tooling
--   - the §20 Admin UI Manager Studio "Schema Inspector" panel
--   - dos-platform-cli `dos schema describe` output
-- Idempotent — COMMENT ON TABLE is overwrite-safe.
-- =====================================================================

BEGIN;

-- §20 Manager Studio (8)
COMMENT ON TABLE dos.ui_manager_projects          IS 'UI-OS §20 — admin Manager Studio container; one project per design effort (project_key UK per tenant). Owns drafts, validation runs, preview sessions, import/export jobs.';
COMMENT ON TABLE dos.ui_manager_drafts            IS 'UI-OS §20 — design drafts within a project; FK to ui_manager_projects. State machine: draft → validating → submitted → (rejected | published). Target identified by (target_kind, target_id).';
COMMENT ON TABLE dos.ui_manager_locks             IS 'UI-OS §20 — pessimistic per-target editing locks; only owner may release. TTL-bounded (1–240 min); expires_at filter + active partial index keep the table hot.';
COMMENT ON TABLE dos.ui_manager_review_comments   IS 'UI-OS §20 — threaded review comments on a draft; resolved-by/resolved-at workflow gating. FK to ui_manager_drafts CASCADE.';
COMMENT ON TABLE dos.ui_manager_validation_runs   IS 'UI-OS §20 — append-only validation history per project; findings JSONB carries hard-gate violations from the publish-time validators.';
COMMENT ON TABLE dos.ui_manager_preview_sessions  IS 'UI-OS §20 — short-lived shareable preview tokens (64-char hex, TTL 1–1440 min, revocable). Token UK across the table.';
COMMENT ON TABLE dos.ui_manager_import_jobs       IS 'UI-OS §20 — async import jobs (queued → running → succeeded/failed/expired/cancelled), 0–100 progress, JSONB error payload.';
COMMENT ON TABLE dos.ui_manager_export_jobs       IS 'UI-OS §20 — async export jobs producing download_url; same status enum + progress as import jobs.';

-- §19 AI Workspace (8)
COMMENT ON TABLE dos.ui_ai_context_panels         IS 'UI-OS §19 — declarative AI side-panel definitions (position via dos.ui_ai_panel_position_t). Bound to routes/widgets to surface contextual AI UX.';
COMMENT ON TABLE dos.ui_ai_suggestions            IS 'UI-OS §19 — generated AI suggestion artifacts surfaced in panels; FK to context panel.';
COMMENT ON TABLE dos.ui_ai_suggestion_feedback    IS 'UI-OS §19 — user feedback on suggestions (thumbs/comments); used by AI quality loops.';
COMMENT ON TABLE dos.ui_ai_action_drafts          IS 'UI-OS §19 — pending agent-proposed actions awaiting human confirmation (state via dos.ui_ai_action_draft_state_t).';
COMMENT ON TABLE dos.ui_ai_workspace_memory       IS 'UI-OS §19 — per-workspace persistent memory pinned by AI tools; tenant-scoped.';
COMMENT ON TABLE dos.ui_ai_prompt_templates       IS 'UI-OS §19 — reusable, versioned prompt templates referenced by ai_context_panels and tools.';
COMMENT ON TABLE dos.ui_ai_prompt_template_tools  IS 'UI-OS §19 — junction table — tools enabled per prompt template (4NF child of ui_ai_prompt_templates).';
COMMENT ON TABLE dos.ui_ai_tool_surface_bindings  IS 'UI-OS §19 — binds AI tools to UI surfaces (route/widget/action); drives "what AI can do here".';

-- Critical core surfaces (4)
COMMENT ON TABLE dos.ui_user_preferences          IS 'UI-OS §11/§13 — global per-user OS prefs (theme, locale, density, direction, accent_color, default_module_code). One row per (tenant_id,user_id).';
COMMENT ON TABLE dos.ui_workspace_states          IS 'UI-OS §14 — WebOS session snapshots: open_apps, panels, active_module, layout_snapshot. One row per (tenant_id,user_id,workspace_key).';
COMMENT ON TABLE dos.ui_dashboards                IS 'UI-OS §5 — dashboard container scoped by tenant/product/module; visibility + role gating fields drive boot manifest filtering.';
COMMENT ON TABLE dos.ui_dashboard_widgets         IS 'UI-OS §5 — widget instances on a dashboard (grid x/y/w/h + per-instance config + data binding). FK to ui_dashboards CASCADE.';

COMMIT;
