-- 20260511_1395_dynamic_ui_agents_updated_at.sql
-- Schema-align: dos.dynamic_ui_agents was missing updated_at.
-- Required by 20260511_1400_dynamic_ui_complete_contract_binding.sql.
-- Idempotent.
BEGIN;
ALTER TABLE dos.dynamic_ui_agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
COMMIT;
