-- Canonical dos.module_sod_rules table (Wave 1 backend completion).
--
-- Background: services/tenant-admin-bff/src/lib/tenant-admin-repo.ts reads
-- dos.module_sod_rules but no migration created the table. The read was
-- silently `.catch(() => ({ rows: [] }))`, hiding the missing relation.
--
-- This migration creates the canonical platform-level module SoD catalog
-- so the tenant-admin BFF returns real rows (and so the dauth SoD engine,
-- which expects `module_sod_rules` per-tenant, has a public source of
-- truth to seed from).
--
-- Idempotent. Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.module_sod_rules (
  rule_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code          TEXT NOT NULL,
  rule_code            TEXT NOT NULL,
  conflict_type        TEXT NOT NULL DEFAULT 'hard'
                          CHECK (conflict_type IN ('hard','soft')),
  resolution_strategy  TEXT NOT NULL DEFAULT 'block'
                          CHECK (resolution_strategy IN ('block','warn','escalate','allow')),
  -- Two role identifiers used by the dauth engine for role-pair conflicts;
  -- nullable when the rule is action-pair only.
  role_a               TEXT,
  role_b               TEXT,
  action_a             TEXT,
  action_b             TEXT,
  severity             TEXT NOT NULL DEFAULT 'high'
                          CHECK (severity IN ('low','medium','high','critical')),
  description_en       TEXT,
  description_ar       TEXT,
  enabled              BOOLEAN NOT NULL DEFAULT true,
  active               BOOLEAN NOT NULL DEFAULT true,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_module_sod_rules UNIQUE (module_code, rule_code)
);

CREATE INDEX IF NOT EXISTS ix_module_sod_rules_enabled
  ON dos.module_sod_rules (module_code, enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS ix_module_sod_rules_severity
  ON dos.module_sod_rules (severity, enabled);

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_auth') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.module_sod_rules TO dos_auth';
  END IF;
END
$grants$;

-- Seed canonical foundation module rules. Mirrors the foundation_sod_rules
-- platform defaults so module-level read paths return the same rule set
-- without hitting the foundation table.
INSERT INTO dos.module_sod_rules
  (module_code, rule_code, conflict_type, resolution_strategy,
   role_a, role_b, severity, description_en, description_ar, enabled, active)
VALUES
  ('foundation','payment_initiator_vs_approver','hard','block',
   'payment_initiator','payment_approver','critical',
   'A user holding payment-initiator must not also hold payment-approver.',
   'لا يجوز للمستخدم الذي يحمل دور منشئ الدفع أن يحمل أيضًا دور الموافقة على الدفع.',
   true,true),
  ('foundation','vendor_setup_vs_payment','hard','block',
   'vendor_admin','payment_approver','high',
   'Vendor admin must not approve payments to vendors they manage.',
   'لا يجوز لمسؤول الموردين الموافقة على المدفوعات للمورد الذي يديره.',
   true,true),
  ('foundation','user_admin_vs_audit','hard','block',
   'foundation_admin','auditor','critical',
   'User admin who can grant access cannot also be the auditor.',
   'لا يجوز للمستخدم الذي يمنح الصلاحيات أن يدققها أيضًا.',
   true,true),
  ('foundation','approver_self_block','hard','block',
   'requester','approver','critical',
   'Requesters cannot self-approve their own requests.',
   'لا يجوز للمتقدم الموافقة على طلبه.',
   true,true),
  ('foundation','committee_self_block','soft','warn',
   'committee_member','agenda_proposer','high',
   'Committee members cannot vote on items they sponsored.',
   'لا يجوز لأعضاء اللجنة التصويت على البنود التي اقترحوها.',
   true,true)
ON CONFLICT (module_code, rule_code) DO UPDATE SET
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
  has_table BOOLEAN;
  rule_count INT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='dos' AND table_name='module_sod_rules') INTO has_table;
  IF NOT has_table THEN RAISE EXCEPTION 'dos.module_sod_rules not created'; END IF;
  SELECT COUNT(*) FROM dos.module_sod_rules WHERE module_code='foundation' INTO rule_count;
  IF rule_count < 5 THEN
    RAISE EXCEPTION 'foundation module SoD rules not seeded (count=%)', rule_count;
  END IF;
END
$verify$;

COMMIT;
