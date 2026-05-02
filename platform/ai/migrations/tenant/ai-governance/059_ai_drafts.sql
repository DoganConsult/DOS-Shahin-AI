-- AI-OS Wave 4.5 — Per-tenant ai_drafts conversation-memory store.
--
-- Holds multi-turn conversation transcripts plus the agent's most-recent
-- "draft" output so a follow-on user message can reference prior turns.
-- Without this table the copilot loses context after every HTTP request
-- (Gate G4 acceptance: "Multi-turn A13 copilot remembers prior question
-- across 3 turns").
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS ai_drafts (
  draft_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  session_id    text NOT NULL,
  user_id       uuid,
  agent_code    text NOT NULL,
  -- 'user' | 'agent' | 'system' — same conversation, ordered by turn_idx.
  role          text NOT NULL CHECK (role IN ('user','agent','system')),
  turn_idx      integer NOT NULL DEFAULT 0,
  content       text NOT NULL,
  -- Free-form metadata: model name, token usage, tool calls, citations.
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Latest draft per session is flagged so the next-turn loader picks
  -- it up cheaply via a partial index. Older drafts are retained for
  -- audit but are_latest=FALSE.
  is_latest     boolean NOT NULL DEFAULT TRUE,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW(),
  expires_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_session
  ON ai_drafts (tenant_id, session_id, turn_idx DESC);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_session_latest
  ON ai_drafts (tenant_id, session_id) WHERE is_latest = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_drafts_agent
  ON ai_drafts (tenant_id, agent_code, created_at DESC);

COMMIT;
