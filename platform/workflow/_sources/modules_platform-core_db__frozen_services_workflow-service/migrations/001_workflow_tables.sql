-- ═══════════════════════════════════════════════════════════════════
-- workflow-service owned tables (AUTHORITATIVE)
--
-- This is the single source of truth for dos.workflow_instances,
-- dos.workflow_tasks, and dos.workflow_approvals schemas.
--
-- All tables use CREATE TABLE IF NOT EXISTS so they no-op if the
-- reconciliation migration (ops/migrations/022) already ran.
--
-- History: Originally split across ops/migrations/009 (legacy columns)
-- and this file (approvals only). Consolidated here per MICROSERVICES-TODO S2-003.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── Workflow Instances ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.workflow_instances (
  instance_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  workflow_type  TEXT NOT NULL,
  name           TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  current_step   TEXT,
  total_steps    INT DEFAULT 0,
  created_by     TEXT,
  entity_type    TEXT,
  entity_id      TEXT,
  context        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  cancel_reason  TEXT
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_tenant ON dos.workflow_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON dos.workflow_instances(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON dos.workflow_instances(entity_type, entity_id);

-- ── Workflow Tasks ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.workflow_tasks (
  task_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  instance_id    UUID REFERENCES dos.workflow_instances(instance_id),
  task_type      TEXT,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  assigned_to    TEXT,
  assigned_by    TEXT,
  completed_by   TEXT,
  outcome        TEXT,
  notes          TEXT,
  due_at         TIMESTAMPTZ,
  context        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_tenant ON dos.workflow_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_instance ON dos.workflow_tasks(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned ON dos.workflow_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_type ON dos.workflow_tasks(task_type);

-- ── Workflow Approvals ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.workflow_approvals (
  approval_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            TEXT NOT NULL,
  workflow_instance_id UUID REFERENCES dos.workflow_instances(instance_id),
  subject              TEXT,
  status               TEXT DEFAULT 'pending',
  requested_by         TEXT NOT NULL,
  approvers            JSONB DEFAULT '[]',
  approved_by          TEXT,
  rejected_by          TEXT,
  escalated_by         TEXT,
  escalated_to         TEXT,
  comment              TEXT,
  reject_reason        TEXT,
  escalation_reason    TEXT,
  context              JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  resolved_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_approvals_tenant ON dos.workflow_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_instance ON dos.workflow_approvals(workflow_instance_id);

-- ── Workflow Templates ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.workflow_templates (
  template_id   VARCHAR(64) PRIMARY KEY,
  template_code VARCHAR(100) NOT NULL,
  module_code   VARCHAR(50),
  display_name  VARCHAR(255),
  definition    JSONB NOT NULL,
  version       INTEGER DEFAULT 1,
  status        VARCHAR(20) DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Job Registry ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.job_registry (
  job_id        VARCHAR(64) PRIMARY KEY,
  job_code      VARCHAR(100) NOT NULL,
  module_code   VARCHAR(50),
  schedule      VARCHAR(100),
  handler       VARCHAR(255),
  config        JSONB DEFAULT '{}',
  status        VARCHAR(20) DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.job_executions (
  execution_id  VARCHAR(64) PRIMARY KEY,
  job_id        VARCHAR(64) NOT NULL,
  tenant_id     VARCHAR(16),
  status        VARCHAR(20) DEFAULT 'running',
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  result        JSONB,
  error         TEXT
);

-- ── Approval Infrastructure (public schema) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.approval_chains (
  chain_id      VARCHAR(64) PRIMARY KEY,
  tenant_id     VARCHAR(16) NOT NULL,
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     VARCHAR(64) NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_requests (
  request_id    VARCHAR(64) PRIMARY KEY,
  chain_id      VARCHAR(64),
  tenant_id     VARCHAR(16) NOT NULL,
  approver_id   VARCHAR(64) NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending',
  decision      VARCHAR(20),
  comment       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  decided_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.approval_steps_log (
  id            SERIAL PRIMARY KEY,
  chain_id      VARCHAR(64),
  step_number   INTEGER,
  approver_id   VARCHAR(64),
  action        VARCHAR(50),
  comment       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
