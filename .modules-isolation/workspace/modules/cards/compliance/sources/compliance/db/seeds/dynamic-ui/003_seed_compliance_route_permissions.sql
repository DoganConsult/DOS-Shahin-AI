-- Compliance — route-level permission hints for Dynamic UI gating.
-- Allow effect rows mean "this route requires permission_key". The platform
-- gateway / SPA guard will enforce. Catch-all keeps NULL permission so deep
-- links can render under their owning route's permission.
--
-- Idempotent: composite PK (route_id, permission_key) makes ON CONFLICT a no-op.

INSERT INTO dos.dynamic_ui_route_permissions (route_id, permission_key, effect)
SELECT r.id, r.permission_key, 'allow'
FROM dos.dynamic_ui_routes r
WHERE r.tenant_id IS NULL
  AND r.module_code = 'compliance'
  AND r.permission_key IS NOT NULL
ON CONFLICT (route_id, permission_key) DO NOTHING;
