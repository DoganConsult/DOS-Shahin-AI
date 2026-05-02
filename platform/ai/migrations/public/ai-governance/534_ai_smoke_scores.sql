-- AI-OS Wave 2 — Per-trace smoke-evaluation score history.
--
-- Captures every smoke-dataset evaluation run by the post-trace
-- evaluator so the platform can compute rolling readiness for each
-- agent prompt version. The "production" Langfuse label promotion is
-- gated on a moving average ≥ 0.7 over ≥ 5 evaluations (PROMOTION_GATE
-- constants in observability/smoke-evaluator.ts).
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.ai_smoke_scores (
  score_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code  text NOT NULL,
  score       numeric(5,4) NOT NULL CHECK (score >= 0 AND score <= 1),
  matched     integer NOT NULL DEFAULT 0,
  total       integer NOT NULL DEFAULT 0,
  trace_ref   text,
  prompt_version text,
  evaluated_at timestamptz NOT NULL DEFAULT NOW(),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ai_smoke_scores_agent_time
  ON public.ai_smoke_scores (agent_code, evaluated_at DESC);

-- Service-role grants. The engine pools across multiple service roles
-- (dos_auth from DATABASE_URL, dos_ai for AI-specific tenant queries,
-- dos_migrator during migrations) so we grant all of them. Each guarded
-- by EXISTS so the migration is portable across environments missing
-- one or more roles.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_auth')     THEN GRANT SELECT, INSERT, UPDATE ON public.ai_smoke_scores TO dos_auth; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_ai')       THEN GRANT SELECT, INSERT, UPDATE ON public.ai_smoke_scores TO dos_ai; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_user')     THEN GRANT SELECT, INSERT, UPDATE ON public.ai_smoke_scores TO dos_user; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_migrator') THEN GRANT SELECT, INSERT, UPDATE ON public.ai_smoke_scores TO dos_migrator; END IF;
END$$;
