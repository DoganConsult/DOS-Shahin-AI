-- PHASE_3B0_CONTRACT_DATA — ariaLabel chrome keys for cds-search callers
--
-- PURPOSE
-- -------
-- Seeds `dos.ui_workspace_chrome` with seven new `shell.*.search.ariaLabel`
-- keys required by Phase 3B accessibility wiring.  This migration ONLY
-- establishes the DB contract rows.  No Angular component, resolver, or
-- template is changed here.  Until Phase 3B wires the resolver to emit
-- these keys, callers will find no runtime value and MUST fail-closed
-- (no `cds-search` rendered, or search rendered without a label until the
-- resolver wiring lands).
--
-- TABLE CHOICE — dos.ui_workspace_chrome
-- ----------------------------------------
-- All `shell.*` chrome scalars consumed by the UI-OS workspace-runtime
-- resolver live in `dos.ui_workspace_chrome`.  The resolver's `loadChrome()`
-- at `services/ui-os-service/src/routes/workspace-shell.routes.ts:467-476`
-- reads every enabled row for the tenant and builds `chrome[key]=value_json`.
-- Resolver then reads named keys (e.g. `shell.header.commandSearch.label`)
-- and overlays them onto surface props.  This is the SAME table that
-- provisions `commandSearchLabel` for `workspace-header` (added by
-- `20260508_0410_workspace_shell_zero_hardcoded_labels.sql`).
--
-- VALUE SHAPE — {"en": "...", "ar": "..."}
-- ------------------------------------------
-- Existing scalar chrome keys store a single-locale JSON string
-- (`'"Search (Ctrl+K)"'::jsonb`).  These seven new keys require
-- bilingual support (English + Arabic) because the callers are module
-- templates and foundation pages that serve both locales.  Storing a
-- JSON object `{"en":"...","ar":"..."}` in the same JSONB column is
-- forward-compatible:
--   • resolver currently does `typeof chrome[key] === 'string'` — an
--     object value is quietly ignored until Phase 3B wires explicit
--     locale-aware extraction, enforcing fail-closed behaviour.
--   • Phase 3B resolver reads `chrome[key].en | chrome[key].ar` per
--     the `req.principal.locale` or `Accept-Language` header.
--   • No new column, table, or schema change required.
--
-- FAIL-CLOSED GUARANTEE
-- ----------------------
-- Because the resolver does NOT yet emit these keys into the runtime
-- surface props, any Phase-3B component that reads the runtime prop and
-- finds nothing MUST render the `cds-search` element hidden/disabled or
-- omit `[label]`.  This migration does NOT pre-wire the resolver.
-- The migration MUST NOT be treated as "resolver wired — done".
--
-- CALLERS (Phase 3A audit rows 3–10, command-search-audit.md)
-- ------------------------------------------------------------
--  1. shell.module-audit-trail.search.ariaLabel
--     → platform/core/platform/shell/templates/module-audit-trail.template.ts:110
--  2. shell.module-heatmap.search.ariaLabel
--     → platform/core/platform/shell/templates/module-heatmap.template.ts:76
--  3. shell.module-records.search.ariaLabel
--     → platform/core/platform/shell/templates/module-records.template.ts:93
--  4. shell.module-page-chrome.search.ariaLabel
--     → platform/config-center/shared/components/module-chrome/module-page-chrome.ts:352
--  5. shell.foundation-register.search.ariaLabel
--     → platform/foundation/ui/pages/foundation-register.component.ts:49
--  6. shell.foundation-module-audit.search.ariaLabel
--     → platform/foundation/ui/pages/foundation-module-audit.component.ts:48
--  7. shell.dos-carbon-search.search.ariaLabel
--     → platform/ui-system/dos-ui-system/src/carbon/dos-carbon-search.component.ts:17
--
-- IDEMPOTENT: safe to re-run; ON CONFLICT DO UPDATE preserves enabled=true.
-- SNAPSHOT: no destructive ops; additive insert only.
-- TENANT-SCOPED: cross-joined against all active workspace_shell_binding tenants.

BEGIN;

WITH active_tenants AS (
  SELECT DISTINCT b.tenant_id
    FROM dos.workspace_shell_binding b
   WHERE b.enabled = true
),
seeds(chrome_key, value_json) AS (
  VALUES
    (
      'shell.module-audit-trail.search.ariaLabel'::text,
      '{"en":"Search audit trail","ar":"البحث في سجل التدقيق"}'::jsonb
    ),
    (
      'shell.module-heatmap.search.ariaLabel'::text,
      '{"en":"Search heatmap items","ar":"البحث في عناصر خريطة الحرارة"}'::jsonb
    ),
    (
      'shell.module-records.search.ariaLabel'::text,
      '{"en":"Search records","ar":"البحث في السجلات"}'::jsonb
    ),
    (
      'shell.module-page-chrome.search.ariaLabel'::text,
      '{"en":"Search audit log","ar":"البحث في سجل التدقيق"}'::jsonb
    ),
    (
      'shell.foundation-register.search.ariaLabel'::text,
      '{"en":"Search users","ar":"البحث عن المستخدمين"}'::jsonb
    ),
    (
      'shell.foundation-module-audit.search.ariaLabel'::text,
      '{"en":"Search events","ar":"البحث عن الأحداث"}'::jsonb
    ),
    (
      'shell.dos-carbon-search.search.ariaLabel'::text,
      '{"en":"Search","ar":"بحث"}'::jsonb
    )
)
INSERT INTO dos.ui_workspace_chrome (tenant_id, chrome_key, value_json, enabled, version)
SELECT t.tenant_id, s.chrome_key, s.value_json, true, 1
  FROM active_tenants t
 CROSS JOIN seeds s
ON CONFLICT (tenant_id, chrome_key) DO UPDATE
  SET value_json = EXCLUDED.value_json,
      enabled    = true,
      updated_at = now();

-- Self-assertion: all 7 chrome keys must exist for at least one active tenant.
DO $$
DECLARE
  v_count integer;
  v_expected_keys text[] := ARRAY[
    'shell.module-audit-trail.search.ariaLabel',
    'shell.module-heatmap.search.ariaLabel',
    'shell.module-records.search.ariaLabel',
    'shell.module-page-chrome.search.ariaLabel',
    'shell.foundation-register.search.ariaLabel',
    'shell.foundation-module-audit.search.ariaLabel',
    'shell.dos-carbon-search.search.ariaLabel'
  ];
  v_key text;
BEGIN
  FOREACH v_key IN ARRAY v_expected_keys LOOP
    SELECT COUNT(*) INTO v_count
      FROM dos.ui_workspace_chrome
     WHERE chrome_key = v_key AND enabled = true;
    IF v_count = 0 THEN
      RAISE EXCEPTION
        'ASSERTION FAILED: chrome key % not seeded for any tenant (expected >= 1 row)',
        v_key;
    END IF;
  END LOOP;
  RAISE NOTICE 'PHASE_3B0_CONTRACT_DATA: all 7 search ariaLabel chrome keys verified.';
END$$;

COMMIT;
