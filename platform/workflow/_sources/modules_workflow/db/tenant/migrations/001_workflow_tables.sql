-- Migration: 001_workflow_tables.sql
-- Module: workflow
-- Schema: __TENANT_SCHEMA__
-- Created: 2026-04-13

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deprecated')),
  version           INTEGER NOT NULL DEFAULT 1,
  config            JSONB NOT NULL DEFAULT '{}',
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflows
ALTER TABLE __TENANT_SCHEMA__.workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflows ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflows ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflows ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflows ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deprecated'));
ALTER TABLE __TENANT_SCHEMA__.workflows ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE __TENANT_SCHEMA__.workflows ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflows ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflows ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_instances (
  instance_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  workflow_type     TEXT NOT NULL,
  name              TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','awaiting_review','completed','cancelled','failed')),
  current_step      TEXT,
  total_steps       INTEGER NOT NULL DEFAULT 0,
  created_by        UUID NOT NULL,
  entity_type       TEXT,
  entity_id         UUID,
  context           JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_instances
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS workflow_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','awaiting_review','completed','cancelled','failed'));
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS current_step TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS total_steps INTEGER NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_instances ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- tenant/027_tenant_schema_tables.sql stubs workflow_instances with
-- `id UUID PRIMARY KEY` and no instance_id column. Module canonical shape
-- uses `instance_id UUID PRIMARY KEY`; downstream FKs target instance_id.
-- On a fresh schema the CREATE TABLE above already makes instance_id the
-- PK (satisfies FK targeting). On a schema where 027's stub pre-exists
-- the CREATE TABLE no-ops; explicitly add instance_id and a UNIQUE
-- constraint so REFERENCES ... (instance_id) resolves.
ALTER TABLE __TENANT_SCHEMA__.workflow_instances
  ADD COLUMN IF NOT EXISTS instance_id UUID NOT NULL DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE c.conname = 'workflow_instances_instance_id_key'
       AND n.nspname = current_schema
  ) AND NOT EXISTS (
    -- A primary-key constraint on instance_id already satisfies the FK
    -- target requirement; don't duplicate it with a UNIQUE constraint.
    SELECT 1 FROM pg_index i
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
     WHERE t.relname  = 'workflow_instances'
       AND n.nspname  = current_schema
       AND i.indisprimary
       AND a.attname  = 'instance_id'
  ) THEN
    ALTER TABLE __TENANT_SCHEMA__.workflow_instances
      ADD CONSTRAINT workflow_instances_instance_id_key UNIQUE (instance_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  step_name         TEXT NOT NULL,
  step_order        INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped','failed')),
  assigned_to       UUID,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  outcome           TEXT,
  notes             TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_steps
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS step_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS step_order INTEGER;
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped','failed'));
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_steps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_transitions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  from_step         TEXT,
  to_step           TEXT NOT NULL,
  from_status       TEXT,
  to_status         TEXT NOT NULL,
  triggered_by      UUID NOT NULL,
  trigger_type      TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual','automatic','system','ai')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_transitions
ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ADD COLUMN IF NOT EXISTS from_step TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ADD COLUMN IF NOT EXISTS to_step TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ADD COLUMN IF NOT EXISTS from_status TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ADD COLUMN IF NOT EXISTS to_status TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ADD COLUMN IF NOT EXISTS triggered_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual','automatic','system','ai'));
ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  version           INTEGER NOT NULL DEFAULT 1,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  template_config   JSONB NOT NULL DEFAULT '{}',
  steps_config      JSONB NOT NULL DEFAULT '[]',
  sla_config        JSONB NOT NULL DEFAULT '{}',
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code, version)
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_templates
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS template_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS steps_config JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS sla_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_template_library (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  template_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.workflow_templates(id),
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  published_at      TIMESTAMPTZ,
  published_by      UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_template_library
ALTER TABLE __TENANT_SCHEMA__.workflow_template_library ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_template_library ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES __TENANT_SCHEMA__.workflow_templates(id);
ALTER TABLE __TENANT_SCHEMA__.workflow_template_library ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.workflow_template_library ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_template_library ADD COLUMN IF NOT EXISTS published_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_template_library ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_approvals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  step_id           UUID REFERENCES __TENANT_SCHEMA__.workflow_steps(id),
  approval_type     TEXT NOT NULL CHECK (approval_type IN ('single','majority','unanimous','sequential')),
  required_approvers JSONB NOT NULL DEFAULT '[]',
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','escalated','expired')),
  decision          TEXT,
  decided_by        UUID,
  decided_at        TIMESTAMPTZ,
  notes             TEXT,
  due_at            TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_approvals
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS step_id UUID REFERENCES __TENANT_SCHEMA__.workflow_steps(id);
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS approval_type TEXT CHECK (approval_type IN ('single','majority','unanimous','sequential'));
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS required_approvers JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','escalated','expired'));
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS decided_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_approvals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_sla_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  workflow_type     TEXT NOT NULL,
  step_name         TEXT,
  sla_hours         INTEGER NOT NULL,
  warning_hours     INTEGER,
  escalation_hours  INTEGER,
  escalation_to     UUID,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_sla_configs
ALTER TABLE __TENANT_SCHEMA__.workflow_sla_configs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_sla_configs ADD COLUMN IF NOT EXISTS workflow_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_sla_configs ADD COLUMN IF NOT EXISTS step_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_sla_configs ADD COLUMN IF NOT EXISTS sla_hours INTEGER;
ALTER TABLE __TENANT_SCHEMA__.workflow_sla_configs ADD COLUMN IF NOT EXISTS warning_hours INTEGER;
ALTER TABLE __TENANT_SCHEMA__.workflow_sla_configs ADD COLUMN IF NOT EXISTS escalation_hours INTEGER;
ALTER TABLE __TENANT_SCHEMA__.workflow_sla_configs ADD COLUMN IF NOT EXISTS escalation_to UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_sla_configs ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.workflow_sla_configs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_sla_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_escalations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  escalation_type   TEXT NOT NULL CHECK (escalation_type IN ('sla_breach','manual','ai_triggered')),
  escalated_to      UUID NOT NULL,
  escalated_by      UUID,
  reason            TEXT,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_escalations
ALTER TABLE __TENANT_SCHEMA__.workflow_escalations ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.workflow_escalations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_escalations ADD COLUMN IF NOT EXISTS escalation_type TEXT CHECK (escalation_type IN ('sla_breach','manual','ai_triggered'));
ALTER TABLE __TENANT_SCHEMA__.workflow_escalations ADD COLUMN IF NOT EXISTS escalated_to UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_escalations ADD COLUMN IF NOT EXISTS escalated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_escalations ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_escalations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved'));
ALTER TABLE __TENANT_SCHEMA__.workflow_escalations ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_escalations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_event_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL,
  tenant_id         UUID NOT NULL,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}',
  actor_id          UUID,
  correlation_id    UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_event_log
ALTER TABLE __TENANT_SCHEMA__.workflow_event_log ADD COLUMN IF NOT EXISTS instance_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_event_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_event_log ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_event_log ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_event_log ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_event_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_event_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_chains (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  config            JSONB NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_chains
ALTER TABLE __TENANT_SCHEMA__.workflow_chains ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_chains ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_chains ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_chains ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_chains ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.workflow_chains ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_chains ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_chains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_ai_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  note_type         TEXT NOT NULL,
  content           TEXT NOT NULL,
  model_used        TEXT,
  confidence        NUMERIC(5,4),
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_ai_notes
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_notes ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_notes ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_notes ADD COLUMN IF NOT EXISTS note_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_notes ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_notes ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_notes ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_notes ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_kill_switches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  workflow_type     TEXT,
  instance_id       UUID,
  is_active         BOOLEAN NOT NULL DEFAULT FALSE,
  reason            TEXT,
  activated_by      UUID,
  activated_at      TIMESTAMPTZ,
  deactivated_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_kill_switches
ALTER TABLE __TENANT_SCHEMA__.workflow_kill_switches ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_kill_switches ADD COLUMN IF NOT EXISTS workflow_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_kill_switches ADD COLUMN IF NOT EXISTS instance_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_kill_switches ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.workflow_kill_switches ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_kill_switches ADD COLUMN IF NOT EXISTS activated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_kill_switches ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_kill_switches ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_kill_switches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_instances_tenant ON __TENANT_SCHEMA__.workflow_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON __TENANT_SCHEMA__.workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON __TENANT_SCHEMA__.workflow_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_instance ON __TENANT_SCHEMA__.workflow_steps(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_instance ON __TENANT_SCHEMA__.workflow_approvals(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_event_log_instance ON __TENANT_SCHEMA__.workflow_event_log(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_escalations_tenant ON __TENANT_SCHEMA__.workflow_escalations(tenant_id, status);
