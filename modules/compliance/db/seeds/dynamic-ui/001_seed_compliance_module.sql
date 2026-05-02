-- Compliance module enrollment into Dynamic UI registry.
-- Canonical hierarchy: DOS → Shahin-AI → Compliance.
-- Mirrors Foundation's seed pattern (Dynamic UI/db/public/seeds/001).

INSERT INTO dos.dynamic_ui_modules (
  module_code, platform_key, product_key, display_name, default_route,
  registry_status, default_tenant_enrollment_status, canonical_source
) VALUES (
  'compliance',
  'dos',
  'shahin-ai',
  'Compliance',
  '/compliance/overview',
  'active',
  'not_enrolled',
  'modules/compliance'
)
ON CONFLICT (module_code) DO UPDATE SET
  platform_key = EXCLUDED.platform_key,
  product_key = EXCLUDED.product_key,
  display_name = EXCLUDED.display_name,
  default_route = EXCLUDED.default_route,
  registry_status = EXCLUDED.registry_status,
  default_tenant_enrollment_status = EXCLUDED.default_tenant_enrollment_status,
  canonical_source = EXCLUDED.canonical_source,
  updated_at = now();
