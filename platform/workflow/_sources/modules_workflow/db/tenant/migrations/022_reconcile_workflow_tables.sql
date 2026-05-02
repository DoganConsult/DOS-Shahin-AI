-- ═══════════════════════════════════════════════════════════════════
-- Migration 022: Reconcile Workflow Table Schema Drift
--
-- Problem: Three CREATE TABLE IF NOT EXISTS definitions raced to define
-- dos.workflow_instances, dos.workflow_tasks, dos.workflow_approvals.
-- Whichever ran first won; the others silently no-oped, leaving
-- missing columns. This migration normalises all three tables to the
-- canonical schema used by the workflow-service domain layer.
--
-- This migration is fully idempotent and handles both scenarios:
--   A) ops/migrations/009 ran first  (UUID PKs, legacy column names)
--   B) workflow-service/migrations/001 ran first (VARCHAR(64) PKs, canonical names)
--
-- Legacy columns are NOT dropped — they stay inert until a future
-- cleanup migration after all consumers are verified clean.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- Phase 3A guard: this reconciliation depends on dos.workflow_* tables
-- created by services/workflow-service/migrations/001_workflow_tables.sql.
-- At runtime, ops/scripts/run-migrations.sh runs platform → services →
-- (later) per-tenant, so the tables exist when this file is run on a
-- tenant schema. The validator and any out-of-order runner must not
-- fail when the tables are not yet present: each ALTER is wrapped in
-- an IF EXISTS guard below.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. dos.workflow_instances — add canonical columns
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name = 'workflow_instances'
  ) THEN
    RAISE NOTICE 'skip 022/workflow_instances: dos.workflow_instances does not exist yet (workflow-service has not run its migrations)';
    RETURN;
  END IF;
  ALTER TABLE dos.workflow_instances ADD COLUMN IF NOT EXISTS entity_type TEXT;
  ALTER TABLE dos.workflow_instances ADD COLUMN IF NOT EXISTS entity_id TEXT;
  ALTER TABLE dos.workflow_instances ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}';
  ALTER TABLE dos.workflow_instances ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
  ALTER TABLE dos.workflow_instances ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
END $$;

-- Backfill: config → context (preserves data if Schema A created 'config')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'workflow_instances' AND column_name = 'config'
  ) THEN
    UPDATE dos.workflow_instances
    SET context = config
    WHERE (context IS NULL OR context = '{}'::jsonb)
      AND config IS NOT NULL AND config != '{}'::jsonb;
  END IF;
END $$;

-- current_step: INT → TEXT (Schema A defined it as INT, canonical is TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'workflow_instances'
      AND column_name = 'current_step'
      AND data_type IN ('integer', 'bigint', 'smallint')
  ) THEN
    ALTER TABLE dos.workflow_instances
      ALTER COLUMN current_step TYPE TEXT USING current_step::TEXT;
  END IF;
END $$;

-- Make name nullable (Schema A had NOT NULL, canonical allows null)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'workflow_instances'
      AND column_name = 'name' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE dos.workflow_instances ALTER COLUMN name DROP NOT NULL;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- 2. dos.workflow_tasks — add canonical columns
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name = 'workflow_tasks'
  ) THEN
    RAISE NOTICE 'skip 022/workflow_tasks: dos.workflow_tasks does not exist yet';
    RETURN;
  END IF;
  ALTER TABLE dos.workflow_tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
  ALTER TABLE dos.workflow_tasks ADD COLUMN IF NOT EXISTS assigned_by TEXT;
  ALTER TABLE dos.workflow_tasks ADD COLUMN IF NOT EXISTS completed_by TEXT;
  ALTER TABLE dos.workflow_tasks ADD COLUMN IF NOT EXISTS outcome TEXT;
  ALTER TABLE dos.workflow_tasks ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE dos.workflow_tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
  ALTER TABLE dos.workflow_tasks ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}';
END $$;

-- Backfill: due_date → due_at (preserves data if Schema A created 'due_date')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'workflow_tasks' AND column_name = 'due_date'
  ) THEN
    UPDATE dos.workflow_tasks
    SET due_at = due_date
    WHERE due_at IS NULL AND due_date IS NOT NULL;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- 3. dos.workflow_approvals — handle UUID/VARCHAR PK + add columns
-- ═══════════════════════════════════════════════════════════════════

-- Fix VARCHAR(64) → UUID if Schema B ran first
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'dos' AND table_name = 'workflow_approvals'
    AND column_name = 'approval_id';

  IF col_type = 'character varying' THEN
    -- All existing values are UUIDs (generated by randomUUID / uuid())
    ALTER TABLE dos.workflow_approvals
      ALTER COLUMN approval_id TYPE UUID USING approval_id::uuid;

    -- Also fix related VARCHAR columns to TEXT for consistency
    ALTER TABLE dos.workflow_approvals ALTER COLUMN tenant_id TYPE TEXT;

    -- workflow_instance_id: VARCHAR(64) → UUID (must match workflow_instances.instance_id)
    ALTER TABLE dos.workflow_approvals
      ALTER COLUMN workflow_instance_id TYPE UUID USING workflow_instance_id::uuid;

    -- Fix any other VARCHAR(64) columns Schema B created
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'dos' AND table_name = 'workflow_approvals'
        AND column_name = 'approved_by' AND data_type = 'character varying'
    ) THEN
      ALTER TABLE dos.workflow_approvals ALTER COLUMN approved_by TYPE TEXT;
      ALTER TABLE dos.workflow_approvals ALTER COLUMN rejected_by TYPE TEXT;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'dos' AND table_name = 'workflow_approvals'
        AND column_name = 'escalated_by' AND data_type = 'character varying'
    ) THEN
      ALTER TABLE dos.workflow_approvals ALTER COLUMN escalated_by TYPE TEXT;
      ALTER TABLE dos.workflow_approvals ALTER COLUMN escalated_to TYPE TEXT;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'dos' AND table_name = 'workflow_approvals'
        AND column_name = 'requested_by' AND data_type = 'character varying'
    ) THEN
      ALTER TABLE dos.workflow_approvals ALTER COLUMN requested_by TYPE TEXT;
    END IF;
  END IF;
END $$;

-- Add FK constraint if missing (Schema B omits it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'dos'
      AND table_name = 'workflow_approvals'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'dos' AND table_name = 'workflow_instances'
    ) THEN
      ALTER TABLE dos.workflow_approvals
        ADD CONSTRAINT fk_wf_approvals_instance
        FOREIGN KEY (workflow_instance_id)
        REFERENCES dos.workflow_instances(instance_id);
    END IF;
  END IF;
END $$;

-- Add canonical columns (idempotent — IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name = 'workflow_approvals'
  ) THEN
    RAISE NOTICE 'skip 022/workflow_approvals canonical columns: dos.workflow_approvals does not exist yet';
    RETURN;
  END IF;
  ALTER TABLE dos.workflow_approvals ADD COLUMN IF NOT EXISTS requested_by TEXT;
  ALTER TABLE dos.workflow_approvals ADD COLUMN IF NOT EXISTS escalated_by TEXT;
  ALTER TABLE dos.workflow_approvals ADD COLUMN IF NOT EXISTS escalated_to TEXT;
  ALTER TABLE dos.workflow_approvals ADD COLUMN IF NOT EXISTS comment TEXT;
  ALTER TABLE dos.workflow_approvals ADD COLUMN IF NOT EXISTS reject_reason TEXT;
  ALTER TABLE dos.workflow_approvals ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
  ALTER TABLE dos.workflow_approvals ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}';
  ALTER TABLE dos.workflow_approvals ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
END $$;

-- Backfill: comments → comment (Schema A name → canonical name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'workflow_approvals'
      AND column_name = 'comments'
  ) THEN
    UPDATE dos.workflow_approvals
    SET comment = comments
    WHERE comment IS NULL AND comments IS NOT NULL;
  END IF;
END $$;

-- Backfill: decided_at → resolved_at (Schema A name → canonical name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'workflow_approvals'
      AND column_name = 'decided_at'
  ) THEN
    UPDATE dos.workflow_approvals
    SET resolved_at = decided_at
    WHERE resolved_at IS NULL AND decided_at IS NOT NULL;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- 4. New indexes for canonical columns
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name = 'workflow_instances'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity
      ON dos.workflow_instances(entity_type, entity_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name = 'workflow_tasks'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_workflow_tasks_type
      ON dos.workflow_tasks(task_type);
  END IF;
END $$;

COMMIT;
