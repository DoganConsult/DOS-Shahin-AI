BEGIN;
INSERT INTO dos.tenant_product_activation (tenant_id, product_key, status)
  SELECT tenant_id, 'shahin-ai', 'active' FROM dos.tenant_profile
  ON CONFLICT (tenant_id, product_key) DO NOTHING;

INSERT INTO dos.tenant_module_entitlements (tenant_id, profile_code, module_code, status, limits)
  SELECT tenant_id, 'grc', 'governance', 'active', '{}'::jsonb
  FROM dos.tenant_profile WHERE profile_code = 'grc'
  ON CONFLICT (tenant_id, profile_code, module_code) DO NOTHING;
COMMIT;
