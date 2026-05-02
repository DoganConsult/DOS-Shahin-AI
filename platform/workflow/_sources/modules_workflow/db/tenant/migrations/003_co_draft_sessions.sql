CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".co_draft_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  agent_id TEXT,
  human_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'drafting',
  draft_content TEXT,
  uncertain_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  human_resolutions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_draft_sessions_updated_at
  ON "__TENANT_SCHEMA__".co_draft_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_co_draft_sessions_human_user_id
  ON "__TENANT_SCHEMA__".co_draft_sessions(human_user_id);

