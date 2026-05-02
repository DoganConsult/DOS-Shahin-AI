-- 502_ai_employees_null_tenant_dedup.sql
-- Phase 1 audit fix: dedupe NULL-tenant rows on ai_employee_shifts.
--
-- The original UNIQUE (tenant_id, agent_id, shift_code) does not deduplicate
-- when tenant_id IS NULL because PostgreSQL treats NULL as distinct from NULL.
-- That caused A13 (Landing Copilot, platform-global) to insert a fresh row on
-- every engine restart instead of upserting.
--
-- Fix: drop the constraint, dedupe existing NULL-tenant duplicates, then
-- recreate with NULLS NOT DISTINCT (PG15+).

-- 1. Collapse duplicates: keep oldest (smallest shift_id) per (NULL, agent_id, shift_code)
DELETE FROM public.ai_employee_shifts a
 USING public.ai_employee_shifts b
 WHERE a.tenant_id IS NULL AND b.tenant_id IS NULL
   AND a.agent_id = b.agent_id AND a.shift_code = b.shift_code
   AND a.shift_id > b.shift_id;

-- 2. Replace constraint with NULLS NOT DISTINCT semantics
ALTER TABLE public.ai_employee_shifts
  DROP CONSTRAINT IF EXISTS ai_employee_shifts_tenant_id_agent_id_shift_code_key;

ALTER TABLE public.ai_employee_shifts
  DROP CONSTRAINT IF EXISTS ai_employee_shifts_tenant_agent_shift_uniq;

ALTER TABLE public.ai_employee_shifts
  ADD CONSTRAINT ai_employee_shifts_tenant_agent_shift_uniq
  UNIQUE NULLS NOT DISTINCT (tenant_id, agent_id, shift_code);
