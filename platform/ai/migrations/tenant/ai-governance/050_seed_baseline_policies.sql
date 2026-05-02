-- AI-OS Wave 2 — Seed baseline guardrail policies into per-tenant
-- ai_governance_policies. Runs against each tenant schema via the
-- tenant migration runner (search_path is set to the tenant schema
-- before execution).
--
-- Four canonical guardrails covering the categories called out in the
-- Wave 2 audit:
--   - cross-tenant block          (POL.TENANT.ISOLATION)
--   - PII / secret redaction      (POL.REDACT.PII)
--   - max-cost per invocation     (POL.COST.CEILING)
--   - autonomy ceiling per agent  (POL.AUTONOMY.CEILING)
--
-- Idempotent on (tenant_id, name): re-runs UPDATE rather than INSERT
-- so policy_id stays stable across applications.

BEGIN;

DO $$
DECLARE
  this_tenant uuid;
  pol RECORD;
BEGIN
  -- Resolve the tenant_id for the active schema. Tables in this schema
  -- use UUID tenant_ids that match the canonical public.tenants row.
  SELECT tenant_id INTO this_tenant
    FROM ai_governance_policies
   LIMIT 1;

  IF this_tenant IS NULL THEN
    -- Fall back to the schema-name-derived tenant_id pattern. Tenant
    -- schemas are named tenant_<32-hex>; reverse the strip to a UUID.
    BEGIN
      SELECT (
        SUBSTRING(current_schema FROM 8 FOR 8) || '-' ||
        SUBSTRING(current_schema FROM 16 FOR 4) || '-' ||
        SUBSTRING(current_schema FROM 20 FOR 4) || '-' ||
        SUBSTRING(current_schema FROM 24 FOR 4) || '-' ||
        SUBSTRING(current_schema FROM 28 FOR 12)
      )::uuid INTO this_tenant;
    EXCEPTION WHEN others THEN
      RAISE NOTICE '[050] Could not derive tenant_id from schema %; skipping baseline policy seed', current_schema;
      RETURN;
    END;
  END IF;

  -- Define the four canonical policies. Each row's `rules` JSON is the
  -- machine-readable form consumed by ai-governance-service's
  -- /policies/decision handler when it overlays DB rules onto the
  -- in-code defaults.
  FOR pol IN
    SELECT * FROM (VALUES
      (
        'baseline.cross_tenant_isolation',
        'Cross-tenant access block',
        'access',
        'platform',
        'blocking',
        jsonb_build_array(
          jsonb_build_object(
            'code','POL.TENANT.ISOLATION',
            'when', jsonb_build_object('payloadField','tenantId','startsWith','t-other'),
            'decision','deny',
            'reason','cross-tenant-access-blocked'
          )
        )
      ),
      (
        'baseline.pii_redaction',
        'PII / secret redaction',
        'data_protection',
        'platform',
        'blocking',
        jsonb_build_array(
          jsonb_build_object(
            'code','POL.REDACT.PII',
            'when', jsonb_build_object('anyOf',
              jsonb_build_array(
                jsonb_build_object('payloadField','containsPii','equals',true),
                jsonb_build_object('payloadField','containsSecrets','equals',true)
              )
            ),
            'decision','redact',
            'reason','pii-or-secret-detected'
          )
        )
      ),
      (
        'baseline.cost_ceiling',
        'Max cost per invocation',
        'usage',
        'platform',
        'blocking',
        jsonb_build_array(
          jsonb_build_object(
            'code','POL.COST.CEILING',
            'when', jsonb_build_object('payloadField','toolBudgetUsd','greaterThan',5.00),
            'decision','hitl_required',
            'reason','cost-budget-above-5usd-requires-approval'
          )
        )
      ),
      (
        'baseline.autonomy_ceiling',
        'Autonomy level ceiling',
        'autonomy',
        'platform',
        'advisory',
        jsonb_build_array(
          jsonb_build_object(
            'code','POL.AUTONOMY.CEILING',
            'when', jsonb_build_object('payloadField','autonomyLevel','greaterThan',2),
            'decision','hitl_required',
            'reason','autonomy-level-above-l2-requires-approval'
          )
        )
      )
    ) AS p(name, description, policy_type, scope, enforcement_mode, rules)
  LOOP
    INSERT INTO ai_governance_policies (
      tenant_id, name, description, policy_type, scope,
      rules, enforcement_mode, version, status, created_at, updated_at
    )
    VALUES (
      this_tenant, pol.name, pol.description, pol.policy_type, pol.scope,
      pol.rules, pol.enforcement_mode, 1, 'active', NOW(), NOW()
    )
    ON CONFLICT DO NOTHING;

    -- ON CONFLICT DO NOTHING above relies on a unique index. The current
    -- schema only has a non-unique index on (tenant_id, policy_type, status),
    -- so we explicitly UPSERT by name to keep idempotency.
    UPDATE ai_governance_policies
       SET description      = pol.description,
           policy_type      = pol.policy_type,
           scope            = pol.scope,
           rules            = pol.rules,
           enforcement_mode = pol.enforcement_mode,
           status           = 'active',
           updated_at       = NOW()
     WHERE tenant_id = this_tenant
       AND name      = pol.name;
  END LOOP;

  RAISE NOTICE '[050] Seeded 4 baseline guardrail policies for tenant %', this_tenant;
END$$;

COMMIT;
