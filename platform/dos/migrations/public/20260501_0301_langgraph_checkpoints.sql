-- =====================================================================
-- LangGraph checkpoints (20260501_0301)
--
-- Persists LangGraph StateGraph checkpoints written by the AI-OS
-- ai-engine-service via PostgresCheckpointSaver. See:
--   platform/ai/services/ai-engine-service/src/langgraph/adapters/
--     checkpoint-postgres.ts
--
-- Schema is `public` (legacy convention referenced by the saver). The
-- saver multi-tenants via the `tenant_id` column (NULL = platform-wide
-- system threads). One row per (thread_id, checkpoint_id).
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.langgraph_checkpoints (
  thread_id      TEXT        NOT NULL,
  checkpoint_id  TEXT        NOT NULL,
  parent_id      TEXT,
  tenant_id      VARCHAR(64),
  checkpoint     JSONB       NOT NULL,
  metadata       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, checkpoint_id)
);

-- Hot-path: getTuple / list both order by created_at DESC for a given thread.
CREATE INDEX IF NOT EXISTS ix_langgraph_ckpt_thread_created
  ON public.langgraph_checkpoints (thread_id, created_at DESC);

-- Tenant scan (governance / GDPR delete by tenant).
CREATE INDEX IF NOT EXISTS ix_langgraph_ckpt_tenant
  ON public.langgraph_checkpoints (tenant_id)
  WHERE tenant_id IS NOT NULL;

COMMIT;
