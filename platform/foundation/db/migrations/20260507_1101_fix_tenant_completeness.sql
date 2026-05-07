-- Fix tenant completeness violations
-- Add missing prod-ent and trial-or-sub for test tenants

-- Insert product entitlements for tenants missing prod-ent
INSERT INTO dos.tenant_product_entitlements (entitlement_id, tenant_id, product_code, entitlement_status, source, starts_at, ends_at, metadata, created_at, updated_at)
SELECT 
  substr(gen_random_uuid()::text, 1, 32) as entitlement_id,
  tenant_id, 
  'shahin-ai-prod' as product_code,
  'active' as entitlement_status,
  'admin' as source,
  NOW() as starts_at,
  NOW() + INTERVAL '365 days' as ends_at,
  '{}'::jsonb as metadata,
  NOW() as created_at,
  NOW() as updated_at
FROM dos.tenants 
WHERE status = 'active'
AND tenant_id NOT IN (
  SELECT DISTINCT tenant_id FROM dos.tenant_product_entitlements WHERE entitlement_status = 'active'
);

-- Insert trial bundles for tenants missing trial-or-sub
INSERT INTO dos.tenant_trials (trial_id, tenant_id, product_code, plan_code, status, starts_at, ends_at, grace_ends_at, verification_status, source, metadata, created_at, updated_at)
SELECT 
  substr(gen_random_uuid()::text, 1, 32) as trial_id,
  tenant_id,
  'shahin-ai-prod' as product_code,
  'standard' as plan_code,
  'trial_active' as status,
  NOW() as starts_at,
  NOW() + INTERVAL '30 days' as ends_at,
  NOW() + INTERVAL '37 days' as grace_ends_at,
  'bypassed' as verification_status,
  'admin' as source,
  '{}'::jsonb as metadata,
  NOW() as created_at,
  NOW() as updated_at
FROM dos.tenants 
WHERE status = 'active'
AND tenant_id NOT IN (
  SELECT tenant_id FROM dos.tenant_trials WHERE status IN ('trial_pending_verification', 'trial_active', 'trial_expiring', 'trial_grace')
)
AND tenant_id NOT IN (
  SELECT tenant_id FROM dos.tenant_subscriptions WHERE status IN ('active', 'past_due', 'grace')
);
