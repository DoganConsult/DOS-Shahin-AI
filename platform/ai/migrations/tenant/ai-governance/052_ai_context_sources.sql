-- AI-OS Wave 2 — Per-tenant ai_context_sources table for grounded RAG.
--
-- Provides the canonical retrieval surface used by A03 (Framework Mapping),
-- A04 (Control Authoring), A07 (Audit Prep), and A08 (Policy Lifecycle).
-- Without this table the rag-pipeline.service falls back to lexical ILIKE
-- search across tenant tables, which loses semantic retrieval and ignores
-- pre-classified knowledge sources entirely.
--
-- Idempotent: CREATE EXTENSION/TABLE/INDEX IF NOT EXISTS. Runs against the
-- active tenant schema (search_path is set by the tenant runner).

BEGIN;

-- pgvector is required for the embedding column. Created in public so
-- every tenant schema can reference its types.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

CREATE TABLE IF NOT EXISTS ai_context_sources (
  source_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text NOT NULL,
  source_type   text NOT NULL
                  CHECK (source_type IN (
                    'framework','control','policy','audit',
                    'risk','incident','vendor','training',
                    'evidence','remediation','generic'
                  )),
  source_ref    text NOT NULL,                 -- e.g. 'frameworks:NCA-ECC' or 'policies:f4c2e8...'
  title         text NOT NULL,
  content       text NOT NULL,                 -- Plain text the agent can read inline
  embedding     public.vector(1536),           -- OpenAI / Anthropic embedding dim. NULL until back-filled.
  tags          text[] NOT NULL DEFAULT ARRAY[]::text[],
  active        boolean NOT NULL DEFAULT TRUE,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, source_ref)
);

CREATE INDEX IF NOT EXISTS idx_ai_context_sources_agent
  ON ai_context_sources (agent_id, active);
CREATE INDEX IF NOT EXISTS idx_ai_context_sources_type
  ON ai_context_sources (source_type, active);
CREATE INDEX IF NOT EXISTS idx_ai_context_sources_tags
  ON ai_context_sources USING GIN (tags);

-- IVFFLAT index gets created lazily once a few rows have embeddings —
-- creating it on an empty table with no embeddings raises a notice.
-- The lazy path lives in ops/scripts/refresh-rag-indexes.mjs.

COMMIT;
