-- 500_ai_employees.sql
-- Phase 1 of "AI Employees" — HR-style data model that turns the 13 canonical
-- agents into real employees of the customer's organization.
--
-- Three new tables, all in the platform `public` schema (cross-tenant). Per-row
-- RLS isolates tenants:
--
--   public.ai_employee_shifts          one row per (tenant, agent, shift_code)
--   public.ai_employee_reports         one row per shift execution; durable artefact
--   public.ai_employee_kpi_snapshots   one row per (tenant, agent, kpi, day)
--
-- Idempotent: every CREATE/INSERT uses IF NOT EXISTS / ON CONFLICT so the
-- migration runner can replay safely.

-- ─── 1. Shifts: per-tenant scheduled work ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_employee_shifts (
  shift_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64),                    -- NULL means platform-global (e.g. A13)
  agent_id          VARCHAR(8)  NOT NULL,           -- A01..A13
  shift_code        TEXT        NOT NULL,           -- stable handle (matches employee.schedule[].code)
  cron_expr         TEXT        NOT NULL,
  local_to_tenant   BOOLEAN     NOT NULL DEFAULT TRUE,
  produces          TEXT        NOT NULL,           -- deliverable code
  per_tenant        BOOLEAN     NOT NULL DEFAULT TRUE,
  enabled           BOOLEAN     NOT NULL DEFAULT TRUE,
  last_run_at       TIMESTAMPTZ,
  next_run_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, agent_id, shift_code)
);
CREATE INDEX IF NOT EXISTS idx_ai_employee_shifts_next ON public.ai_employee_shifts (enabled, next_run_at) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_employee_shifts_agent ON public.ai_employee_shifts (agent_id);

-- ─── 2. Reports: durable artefacts produced by each shift ────────────────
CREATE TABLE IF NOT EXISTS public.ai_employee_reports (
  report_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64),
  agent_id          VARCHAR(8)  NOT NULL,
  shift_code        TEXT,                           -- NULL for ad-hoc reports
  deliverable_code  TEXT        NOT NULL,           -- matches employee.deliverables[].code
  title             TEXT        NOT NULL,
  summary           TEXT,                           -- one-line manager-inbox summary
  body              JSONB       NOT NULL DEFAULT '{}',  -- full structured payload
  metrics           JSONB       NOT NULL DEFAULT '{}',  -- KPI snapshot at the time
  destination       TEXT        NOT NULL DEFAULT 'manager_inbox',
  status            TEXT        NOT NULL DEFAULT 'filed',  -- filed | acknowledged | actioned
  acknowledged_by   VARCHAR(64),
  acknowledged_at   TIMESTAMPTZ,
  filed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_employee_reports_tenant_agent ON public.ai_employee_reports (tenant_id, agent_id, filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_employee_reports_status ON public.ai_employee_reports (status, filed_at DESC) WHERE status = 'filed';

-- ─── 3. KPI snapshots: daily roll-up per (tenant, agent, kpi) ────────────
CREATE TABLE IF NOT EXISTS public.ai_employee_kpi_snapshots (
  snapshot_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64),
  agent_id          VARCHAR(8)  NOT NULL,
  kpi_code          TEXT        NOT NULL,
  value_numeric     NUMERIC,
  value_text        TEXT,
  target_met        BOOLEAN,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computed_for_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  source            TEXT,                           -- audit_trail | langfuse | tenant_db | derived
  UNIQUE (tenant_id, agent_id, kpi_code, computed_for_date)
);
CREATE INDEX IF NOT EXISTS idx_ai_employee_kpi_lookup ON public.ai_employee_kpi_snapshots (tenant_id, agent_id, computed_for_date DESC);

-- ─── 4. RLS: tenant_id isolation; NULL means platform-global ─────────────
ALTER TABLE public.ai_employee_shifts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_employee_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_employee_kpi_snapshots   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY ai_employee_shifts_tenant_isolation ON public.ai_employee_shifts
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', TRUE));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY ai_employee_reports_tenant_isolation ON public.ai_employee_reports
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', TRUE));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY ai_employee_kpi_snapshots_tenant_isolation ON public.ai_employee_kpi_snapshots
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', TRUE));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service-role bypass for the engine + cron-runner (matches platform pattern)
DO $$ BEGIN
  CREATE POLICY ai_employee_shifts_service_role ON public.ai_employee_shifts
    USING (current_setting('app.tenant_id', TRUE) IS NULL OR current_setting('app.tenant_id', TRUE) = 'service-role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY ai_employee_reports_service_role ON public.ai_employee_reports
    USING (current_setting('app.tenant_id', TRUE) IS NULL OR current_setting('app.tenant_id', TRUE) = 'service-role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY ai_employee_kpi_snapshots_service_role ON public.ai_employee_kpi_snapshots
    USING (current_setting('app.tenant_id', TRUE) IS NULL OR current_setting('app.tenant_id', TRUE) = 'service-role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE ON public.ai_employee_shifts          TO dos_ai;
GRANT SELECT, INSERT, UPDATE ON public.ai_employee_reports         TO dos_ai;
GRANT SELECT, INSERT, UPDATE ON public.ai_employee_kpi_snapshots   TO dos_ai;
