-- Canonical dos.module_sod_rules reconciliation (Wave 1 backend completion).
--
-- Background:
--   - services/tenant-admin-bff/src/lib/tenant-admin-repo.ts reads
--     dos.module_sod_rules expecting columns
--     (rule_code, conflict_type, role_a, role_b, severity, enabled)
--   - The existing public.module_sod_rules row shape is action-pair
--     (action_a, action_b, ..., active) with no role/rule_code columns.
--   - The read used `.catch(() => ({ rows: [] }))`, hiding the drift.
--
-- This migration extends the existing canonical table with the role-pair
-- columns the BFF needs and back-fills `enabled` from `active`. It does
-- NOT drop or rename existing columns; the action-pair surface remains
-- intact for the dauth engine.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- Skip cleanly if some other migration already created module_sod_rules
-- with a different (e.g. role-pair) shape — only ALTER our canonical one.
DO $ensure_table$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='dos' AND table_name='module_sod_rules'
  ) THEN
    EXECUTE $$
      CREATE TABLE dos.module_sod_rules (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_code          TEXT NOT NULL,
        action_a             TEXT NOT NULL,
        action_b             TEXT NOT NULL,
        conflict_type        TEXT NOT NULL DEFAULT 'hard'
                                CHECK (conflict_type IN ('hard','soft')),
        resolution_strategy  TEXT NOT NULL DEFAULT 'escalate'
                                CHECK (resolution_strategy IN ('block','warn','escalate','allow')),
        description_en       TEXT,
        description_ar       TEXT,
        severity             TEXT DEFAULT 'high',
        delegate_to_role     TEXT,
        escalation_roles     TEXT[] DEFAULT '{}'::text[],
        deadline_hours       INTEGER DEFAULT 48,
        active               BOOLEAN NOT NULL DEFAULT true,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_module_sod_rules_action UNIQUE (module_code, action_a, action_b)
      )
    $$;
  END IF;
END
$ensure_table$;

-- Reconciliation columns expected by tenant-admin-bff repo.
ALTER TABLE dos.module_sod_rules
  ADD COLUMN IF NOT EXISTS rule_code TEXT,
  ADD COLUMN IF NOT EXISTS role_a    TEXT,
  ADD COLUMN IF NOT EXISTS role_b    TEXT,
  ADD COLUMN IF NOT EXISTS enabled   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata  JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill: keep enabled in lock-step with active for legacy callers.
UPDATE dos.module_sod_rules
   SET enabled = COALESCE(active, true)
 WHERE enabled IS DISTINCT FROM COALESCE(active, true);

-- Backfill rule_code from action pair when not provided.
UPDATE dos.module_sod_rules
   SET rule_code = COALESCE(rule_code, module_code || '.' || action_a || '_vs_' || action_b)
 WHERE rule_code IS NULL OR rule_code = '';

-- Add a unique index on the canonical (module_code, rule_code) tuple.
DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='dos' AND indexname='uq_module_sod_rules_rule_code'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_module_sod_rules_rule_code
             ON dos.module_sod_rules (module_code, rule_code)
             WHERE rule_code IS NOT NULL';
  END IF;
END
$constraint$;

CREATE INDEX IF NOT EXISTS ix_module_sod_rules_enabled
  ON dos.module_sod_rules (module_code, enabled);

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_auth') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.module_sod_rules TO dos_auth';
  END IF;
END
$grants$;

-- Seed canonical foundation module rules. Insert role-pair rows with
-- explicit rule_code so the BFF returns real rows. Action columns get
-- placeholder values mirroring rule_code so the action-pair NOT NULL
-- constraint is satisfied without invading the dauth seed surface.
INSERT INTO dos.module_sod_rules
  (module_code, rule_code, action_a, action_b, conflict_type, resolution_strategy,
   role_a, role_b, severity, description_en, description_ar, enabled, active)
VALUES
  ('foundation','foundation.payment_initiator_vs_approver',
   'role:payment_initiator','role:payment_approver','hard','block',
   'payment_initiator','payment_approver','critical',
   'A user holding payment-initiator must not also hold payment-approver.',
   'لا يجوز للمستخدم الذي يحمل دور منشئ الدفع أن يحمل أيضًا دور الموافقة على الدفع.',
   true,true),
  ('foundation','foundation.vendor_setup_vs_payment',
   'role:vendor_admin','role:payment_approver','hard','block',
   'vendor_admin','payment_approver','high',
   'Vendor admin must not approve payments to vendors they manage.',
   'لا يجوز لمسؤول الموردين الموافقة على المدفوعات للمورد الذي يديره.',
   true,true),
  ('foundation','foundation.user_admin_vs_audit',
   'role:foundation_admin','role:auditor','hard','block',
   'foundation_admin','auditor','critical',
   'User admin who can grant access cannot also be the auditor.',
   'لا يجوز للمستخدم الذي يمنح الصلاحيات أن يدققها أيضًا.',
   true,true),
  ('foundation','foundation.approver_self_block',
   'role:requester','role:approver','hard','block',
   'requester','approver','critical',
   'Requesters cannot self-approve their own requests.',
   'لا يجوز للمتقدم الموافقة على طلبه.',
   true,true),
  ('foundation','foundation.committee_self_block',
   'role:committee_member','role:agenda_proposer','soft','warn',
   'committee_member','agenda_proposer','high',
   'Committee members cannot vote on items they sponsored.',
   'لا يجوز لأعضاء اللجنة التصويت على البنود التي اقترحوها.',
   true,true)
ON CONFLICT (module_code, action_a, action_b) DO UPDATE SET
  rule_code = EXCLUDED.rule_code,
  conflict_type = EXCLUDED.conflict_type,
  resolution_strategy = EXCLUDED.resolution_strategy,
  role_a = EXCLUDED.role_a, role_b = EXCLUDED.role_b,
  severity = EXCLUDED.severity,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  enabled = EXCLUDED.enabled, active = EXCLUDED.active,
  updated_at = now();

DO $verify$
DECLARE
  rule_count INT;
BEGIN
  SELECT COUNT(*) FROM dos.module_sod_rules
   WHERE module_code='foundation' AND enabled=true AND role_a IS NOT NULL
   INTO rule_count;
  IF rule_count < 5 THEN
    RAISE EXCEPTION 'foundation module SoD rules not seeded (count=%)', rule_count;
  END IF;
END
$verify$;

COMMIT;
