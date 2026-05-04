-- 20260505_0410_workspace_home_layered_demo.sql
-- Owner: ui-os-service.
--
-- Phase F-F9 reference seeds — demonstrates each Dynamic-UI layer for the
-- /workspace-home route so an operator can verify the merge order via:
--
--   curl -H 'x-product-code: shahin-ai' \
--        -H 'x-tenant-id: 14f273cf260a4736' \
--        -H 'x-user-sub: u1' \
--        -H 'x-user-roles: standard_user' \
--        'http://localhost:4015/template-binding?route=/workspace-home' \
--        | jq '._layers, .props.masthead, .props.kpis | length'
--
-- Layer-by-layer effect:
--   Product 'shahin-ai'        → adds  brand: { code, label }
--                                tweaks pillars.evidence to a product-wide phrasing
--   Module  'foundation'       → adds  pillars.whyItMatters override
--                                adds  workspaceMode: 'foundation-overview'
--   Tenant  14f273cf260a4736   → tweaks masthead.statusTags to add a tenant pill
--                                adds  tenantBranding marker
--   (User layer is left empty in this seed — populate per-user from the
--   admin UI or via a separate migration once user_ids are known.)
--
-- Idempotent (UPSERT on PK).

BEGIN;

-- =====================================================================
-- ② PRODUCT layer — applies to every route on shahin-ai
-- =====================================================================
INSERT INTO dos.ui_override_product (product_code, patch) VALUES (
  'shahin-ai',
  jsonb_build_object(
    'brand', jsonb_build_object(
      'code',     'shahin-ai',
      'label',    'Shahin-AI+',
      'labelAr',  'شاهين-AI+'
    ),
    'pillars', jsonb_build_object(
      'evidence',
        'Shahin-AI evidence engine · live correlation across 47 risk records.'
    )
  )
)
ON CONFLICT (product_code) DO UPDATE
   SET patch      = EXCLUDED.patch,
       updated_at = now();

-- =====================================================================
-- ③ MODULE layer — applies to /foundation/*, /workspace-home, /profile, …
-- =====================================================================
INSERT INTO dos.ui_override_module (module_code, patch) VALUES (
  'foundation',
  jsonb_build_object(
    'workspaceMode', 'foundation-overview',
    'pillars', jsonb_build_object(
      'whyItMatters',
        'Foundation home · sign-off cycle is open and unmitigated obligations block close.'
    )
  )
)
ON CONFLICT (module_code) DO UPDATE
   SET patch      = EXCLUDED.patch,
       updated_at = now();

-- =====================================================================
-- ⑤ TENANT layer — picks the first sandbox tenant for the demo. Other
-- tenants are unaffected. The wildcard route '*' applies to every page
-- this tenant visits; switch to a specific route value to scope it.
-- =====================================================================
INSERT INTO dos.ui_override_tenant (tenant_id, route, patch) VALUES (
  '14f273cf260a4736',
  '*',
  jsonb_build_object(
    'tenantBranding', jsonb_build_object(
      'code',  'sandbox',
      'pill',  'Sandbox tenant'
    ),
    'masthead', jsonb_build_object(
      'statusTags', jsonb_build_array(
        jsonb_build_object('label', 'Live',           'severity', 'success'),
        jsonb_build_object('label', 'AI assisted',    'severity', 'info'),
        jsonb_build_object('label', 'Sandbox',        'severity', 'warning')
      )
    )
  )
)
ON CONFLICT (tenant_id, route) DO UPDATE
   SET patch      = EXCLUDED.patch,
       updated_at = now();

-- =====================================================================
-- ⑥ USER layer — schema demo only. Real per-user rows are inserted
-- from the admin UI; we add ONE example row keyed on a clearly-fake id
-- so it never matches a live user. Operators can DELETE this row at any
-- time without consequence.
-- =====================================================================
INSERT INTO dos.ui_override_user (user_id, route, patch) VALUES (
  'demo-user-do-not-match',
  '/workspace-home',
  jsonb_build_object(
    'masthead', jsonb_build_object(
      'aiHeadline',
        'Welcome back — your personal queue has 2 items waiting.'
    )
  )
)
ON CONFLICT (user_id, route) DO UPDATE
   SET patch      = EXCLUDED.patch,
       updated_at = now();

COMMIT;
