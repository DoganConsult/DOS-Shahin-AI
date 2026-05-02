-- AI-OS Wave 5.4 — Tenant AI budget ledger.
--
-- Per-tenant monthly USD ceiling for autonomous LLM spend. Enforcement
-- is at runAgent boundary: query monthly_usd_limit vs SUM(cost_usd) for
-- the current billing month; if exceeded → reject + DSOC alert.
--
-- This migration creates the ledger schema. Runtime enforcement and
-- DSOC alert wiring land in the engine code (Wave 5.4 follow-up).
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.ai_budgets (
  budget_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL,
  -- 'monthly' is the only mode supported today; calendar-month rollover.
  -- Future: 'rolling_30d' / 'fiscal_quarter'.
  period               text NOT NULL DEFAULT 'monthly'
                         CHECK (period IN ('monthly','rolling_30d','fiscal_quarter')),
  monthly_usd_limit    numeric(12,4) NOT NULL CHECK (monthly_usd_limit > 0),
  -- Soft cap → warn DSOC at 80% / 90%. Hard cap → reject at 100%.
  soft_cap_percent     integer NOT NULL DEFAULT 80
                         CHECK (soft_cap_percent BETWEEN 1 AND 99),
  warn_emails          text[] NOT NULL DEFAULT ARRAY[]::text[],
  effective_from       date NOT NULL DEFAULT CURRENT_DATE,
  effective_until      date,
  status               text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','suspended','expired')),
  notes                text,
  created_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  updated_at           timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_budgets_tenant_active
  ON public.ai_budgets (tenant_id, status)
  WHERE status = 'active';

-- Rolling spend view — calendar-month aggregate of the per-tenant
-- ai_agent_executions cost_usd column. Used by enforcement to compare
-- against ai_budgets.monthly_usd_limit. NOTE: per-tenant tables are
-- queried by the runtime; this view is a documentation placeholder.
COMMENT ON TABLE public.ai_budgets IS
  'Wave 5.4 — tenant USD spend ceilings. Runtime enforcement reads SUM(cost_usd) from each tenant''s ai_agent_executions and compares to monthly_usd_limit. Hard cap → reject + DSOC alert.';

-- Service-role grants so the engine pool can read.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_auth')     THEN GRANT SELECT, INSERT, UPDATE ON public.ai_budgets TO dos_auth; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_ai')       THEN GRANT SELECT, INSERT, UPDATE ON public.ai_budgets TO dos_ai; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_user')     THEN GRANT SELECT, INSERT, UPDATE ON public.ai_budgets TO dos_user; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_migrator') THEN GRANT SELECT, INSERT, UPDATE ON public.ai_budgets TO dos_migrator; END IF;
END$$;
