-- Migration 040: Soft-delete columns on tenant risk_risks (audit / rollback discipline)
-- Matches pattern from 039_module_config_audit_hardening.sql

ALTER TABLE "__TENANT_SCHEMA__"."risk_risks"
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

CREATE INDEX IF NOT EXISTS idx_risk_risks_active
  ON "__TENANT_SCHEMA__"."risk_risks" (tenant_id)
  WHERE deleted_at IS NULL;
