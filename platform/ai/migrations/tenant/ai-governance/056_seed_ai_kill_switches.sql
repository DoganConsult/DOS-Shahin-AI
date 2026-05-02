-- AI-OS Wave 2 — Seed one inactive (armed) kill switch per agent per
-- tenant. Without these seed rows the kill-switch UI button has nothing
-- to flip and operators cannot trip an agent without manually creating
-- the row first. Idempotent ON CONFLICT (tenant_id, agent_id).

BEGIN;

DO $$
DECLARE
  this_tenant uuid;
  agent_codes text[] := ARRAY['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12','A13'];
  agent_names text[] := ARRAY[
    'Onboarding Agent','Identity Provisioning Agent','Framework Mapping Agent',
    'Control Authoring Agent','Risk Analysis Agent','Gap Remediation Agent',
    'Audit Prep Agent','Policy Lifecycle Agent','Incident Response Agent',
    'Vendor Risk Agent','Training Agent','Reporting Agent',
    'Policy Review & Landing Copilot'
  ];
  i int;
BEGIN
  -- Resolve the active tenant_id from the schema name (8-4-4-4-12 hex).
  BEGIN
    SELECT (
      SUBSTRING(current_schema FROM 8 FOR 8) || '-' ||
      SUBSTRING(current_schema FROM 16 FOR 4) || '-' ||
      SUBSTRING(current_schema FROM 20 FOR 4) || '-' ||
      SUBSTRING(current_schema FROM 24 FOR 4) || '-' ||
      SUBSTRING(current_schema FROM 28 FOR 12)
    )::uuid INTO this_tenant;
  EXCEPTION WHEN others THEN
    RAISE NOTICE '[056] schema % is not UUID-named — skipping kill-switch seed', current_schema;
    RETURN;
  END;

  FOR i IN 1..array_length(agent_codes, 1) LOOP
    -- Partial unique index uq_ai_kill_switches_tenant_agent doesn't
    -- satisfy ON CONFLICT inference; do an explicit UPSERT.
    UPDATE ai_kill_switches
       SET asset_name = agent_names[i],
           asset_type = 'agent',
           kill_switch_type = 'api_disable',
           trigger_method = 'manual',
           fallback_procedure = 'Block all tool calls; preserve in-flight runs',
           updated_at = NOW()
     WHERE tenant_id = this_tenant
       AND agent_id = agent_codes[i];
    IF NOT FOUND THEN
      INSERT INTO ai_kill_switches (
        tenant_id, agent_id, asset_id, asset_name, asset_type,
        kill_switch_type, trigger_method, fallback_procedure,
        status, active, created_at, updated_at
      )
      VALUES (
        this_tenant, agent_codes[i], NULL, agent_names[i], 'agent',
        'api_disable', 'manual', 'Block all tool calls; preserve in-flight runs',
        'armed', FALSE, NOW(), NOW()
      );
    END IF;
  END LOOP;

  RAISE NOTICE '[056] Seeded 13 kill switches for tenant %', this_tenant;
END$$;

COMMIT;
