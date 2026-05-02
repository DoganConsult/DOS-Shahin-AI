-- dos:draft
-- =====================================================================
-- UI-OS — §19 AI Workspace — context panels, suggestions, drafts, memory  (20260502_0128)
--
-- Tables (8) — DKNF via dos.ui_form_decision_t (re-used for accept/reject).
-- 1NF: ai_prompt_template_tools is the m2m child for tool_codes
-- (tools are first-class entities in the AI-OS tool registry).
--
-- Overlap note: dos.public.ai_drafts (engine-side) holds the draft outputs.
-- ui_ai_action_drafts is the UI-side reference — linked_engine_draft_id is
-- a soft reference, never duplicates the body.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_ai_context_panels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  route_key     VARCHAR(200) NOT NULL,
  position      dos.ui_ai_panel_position_t NOT NULL DEFAULT 'right',
  default_open  BOOLEAN NOT NULL DEFAULT FALSE,
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_ai_context_panels_uk UNIQUE (tenant_id, route_key)
);

CREATE TABLE IF NOT EXISTS dos.ui_ai_suggestions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  user_id           VARCHAR(64) NOT NULL,
  surface_key       VARCHAR(200) NOT NULL,
  suggestion_kind   VARCHAR(60) NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  shown_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_ai_suggestions_user_time
  ON dos.ui_ai_suggestions (tenant_id, user_id, shown_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_ai_suggestion_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  suggestion_id   UUID NOT NULL,
  user_id         VARCHAR(64) NOT NULL,
  decision        dos.ui_form_decision_t NOT NULL,
  comment         TEXT,
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_ai_suggestion_feedback_suggestion_fk
    FOREIGN KEY (suggestion_id) REFERENCES dos.ui_ai_suggestions(id) ON DELETE CASCADE,
  CONSTRAINT ui_ai_suggestion_feedback_uk
    UNIQUE (suggestion_id, user_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_ai_action_drafts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                VARCHAR(64) NOT NULL,
  user_id                  VARCHAR(64) NOT NULL,
  action_code              VARCHAR(150) NOT NULL,
  params                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  state                    dos.ui_ai_action_draft_state_t NOT NULL DEFAULT 'pending',
  linked_engine_draft_id   UUID,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_ai_action_drafts_user
  ON dos.ui_ai_action_drafts (tenant_id, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_ai_workspace_memory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  memory_key    VARCHAR(150) NOT NULL,
  value         JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_ai_workspace_memory_uk
    UNIQUE (tenant_id, user_id, memory_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_ai_workspace_memory_expires
  ON dos.ui_ai_workspace_memory (expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS dos.ui_ai_prompt_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  template_key  VARCHAR(150) NOT NULL,
  body          TEXT NOT NULL,
  model_hint    VARCHAR(100),
  description_key VARCHAR(200),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    VARCHAR(64),
  updated_by    VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_ai_prompt_templates_uk
    UNIQUE (tenant_id, template_key)
);

-- 1NF child: explodes prior `tool_codes TEXT[]` (tools are first-class)
CREATE TABLE IF NOT EXISTS dos.ui_ai_prompt_template_tools (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  prompt_template_id  UUID NOT NULL,
  tool_code           VARCHAR(150) NOT NULL,
  display_order       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT ui_ai_prompt_template_tools_template_fk
    FOREIGN KEY (prompt_template_id) REFERENCES dos.ui_ai_prompt_templates(id) ON DELETE CASCADE,
  CONSTRAINT ui_ai_prompt_template_tools_uk
    UNIQUE (prompt_template_id, tool_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_ai_tool_surface_bindings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  surface_key   VARCHAR(200) NOT NULL,
  tool_code     VARCHAR(150) NOT NULL,
  effect        dos.ui_perm_effect_t NOT NULL DEFAULT 'allow',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_ai_tool_surface_bindings_uk
    UNIQUE (tenant_id, surface_key, tool_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_ai_tool_surface_bindings_surface
  ON dos.ui_ai_tool_surface_bindings (tenant_id, surface_key);

COMMIT;
