-- =============================================================================
-- Migration: 20260505_2300_backfill_dogan_module_entitlements
-- Purpose:   Backfill dogan tenant with missing module entitlements to match
--            control tenant configuration (33 total).
--
-- Issue:     dogan has only 3 module entitlements (foundation, ai-platform, config-center)
--            vs 33 for control tenants. Missing 30 modules.
--
-- Fix:       Add 30 missing module entitlements from control tenant to dogan.
--            Add 1 subscription row for dogan.
--
-- Idempotent: YES — INSERT ... ON CONFLICT DO NOTHING pattern.
-- =============================================================================

BEGIN;

-- ─── 1. Backfill module entitlements from control tenant ─────────────────────
INSERT INTO dos.tenant_module_entitlements (
  entitlement_id,
  tenant_id,
  product_code,
  module_code,
  entitlement_status,
  source,
  trial_id,
  limits_json,
  starts_at,
  ends_at,
  metadata
)
SELECT 
  encode(gen_random_bytes(16), 'hex') as entitlement_id,
  'dogan' as tenant_id,
  ce.product_code,
  ce.module_code,
  ce.entitlement_status,
  ce.source,
  ce.trial_id,
  ce.limits_json,
  ce.starts_at,
  ce.ends_at,
  ce.metadata
FROM dos.tenant_module_entitlements ce
WHERE ce.tenant_id = '51f36271df62ea3d'
  AND ce.module_code NOT IN (
    SELECT module_code FROM dos.tenant_module_entitlements WHERE tenant_id = 'dogan'
  );

-- ─── 2. Add subscription row for dogan ──────────────────────────────────────
INSERT INTO dos.tenant_subscriptions (
  subscription_id,
  tenant_id,
  product_code,
  plan_code,
  status,
  billing_status,
  trial_id,
  current_period_start,
  current_period_end,
  grace_ends_at,
  provider_mode,
  provider_ref,
  metadata
)
SELECT 
  encode(gen_random_bytes(16), 'hex') as subscription_id,
  'dogan' as tenant_id,
  cs.product_code,
  cs.plan_code,
  cs.status,
  cs.billing_status,
  cs.trial_id,
  cs.current_period_start,
  cs.current_period_end,
  cs.grace_ends_at,
  cs.provider_mode,
  cs.provider_ref,
  cs.metadata
FROM dos.tenant_subscriptions cs
WHERE cs.tenant_id = '51f36271df62ea3d'
  AND NOT EXISTS (
    SELECT 1 FROM dos.tenant_subscriptions WHERE tenant_id = 'dogan'
  );

-- ─── 3. Self-assertion: verify backfill success ───────────────────────────────
DO $$
DECLARE
  entitlement_count INTEGER;
  subscription_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO entitlement_count
  FROM dos.tenant_module_entitlements
  WHERE tenant_id = 'dogan';
  
  IF entitlement_count < 33 THEN
    RAISE EXCEPTION 'Dogan module entitlement backfill: expected 33, got %', entitlement_count;
  END IF;

  SELECT COUNT(*) INTO subscription_count
  FROM dos.tenant_subscriptions
  WHERE tenant_id = 'dogan';
  
  IF subscription_count < 1 THEN
    RAISE EXCEPTION 'Dogan subscription backfill: expected at least 1, got %', subscription_count;
  END IF;
END $$;

COMMIT;

-- ─── Rollback Procedure (if needed) ────────────────────────────────────────
-- DELETE FROM dos.tenant_module_entitlements
-- WHERE tenant_id = 'dogan'
-- AND module_code NOT IN ('ai-platform', 'config-center', 'foundation');
-- DELETE FROM dos.tenant_subscriptions
-- WHERE tenant_id = 'dogan';
