#!/usr/bin/env node
// W5 — Patch 1 platform-admin DNA enrollment + UI service-registry verifier.
//
// Verifies:
//   1. dos.dynamic_ui_modules has all 9 DNA modules with product_key='platform'.
//   2. dos.dynamic_ui_navigation has 3 platform-default groups + 11 children
//      (tenant_id IS NULL) for the DNA module set.
//   3. dos.platform_admin_module_roles has 18 grants
//      (platform_admin + platform_super_admin × 9 modules).
//   4. dos.ui_service_registry has at least 40 services and matches the
//      ports.allocation.json count.
//   5. Each row in dos.ui_service_registry referencing a module_code points
//      at a real DNA module (FK already enforces, but we double-check).
//   6. Both target tables remain free of ARRAY columns (6NF invariant).
//   7. (Optional, when SMOKE_HTTP=1) the 4 ui-os-service platform-admin
//      endpoints respond with the expected counts.

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const DB = process.env.DATABASE_URL
  || 'postgresql://dos_app:dos_app_pass_2026@localhost:5432/shahin_grc';
const SMOKE_HTTP = process.env.SMOKE_HTTP === '1';
const UI_OS_BASE = process.env.UI_OS_BASE || 'http://127.0.0.1:4015';

const DNA_MODULES = [
  'dauth', 'config-center', 'tenant-management', 'multi-tenant-mgmt',
  'foundation-admin', 'dos-platform', 'dnoc', 'dsoc', 'ai-platform',
];

const failures = [];
const oks = [];
function check(label, cond, detail) {
  (cond ? oks : failures).push(`${cond ? '✓' : '✗'} ${label}${detail ? ' — ' + detail : ''}`);
}

const pool = new pg.Pool({ connectionString: DB });
try {
  // 1. DNA modules
  const m = await pool.query(
    `SELECT module_code FROM dos.dynamic_ui_modules
      WHERE product_key='platform' AND module_code = ANY($1::text[])`,
    [DNA_MODULES],
  );
  const have = new Set(m.rows.map(r => r.module_code));
  for (const code of DNA_MODULES) {
    check(`module ${code}`, have.has(code), have.has(code) ? null : 'missing in dos.dynamic_ui_modules');
  }

  // 2. Navigation groups + children (tenant_id IS NULL)
  const nav = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE parent_id IS NULL)::int AS groups,
            COUNT(*) FILTER (WHERE parent_id IS NOT NULL)::int AS children
       FROM dos.dynamic_ui_navigation
      WHERE tenant_id IS NULL AND module_code = ANY($1::text[])`,
    [DNA_MODULES],
  );
  const n = nav.rows[0];
  check('navigation groups (3)', n.groups === 3, `actual=${n.groups}`);
  check('navigation children (11)', n.children === 11, `actual=${n.children}`);

  // 3. Module-role grants
  const r = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(DISTINCT role_code)::int AS roles
       FROM dos.platform_admin_module_roles
      WHERE module_code = ANY($1::text[])`,
    [DNA_MODULES],
  );
  check('module_roles total (18)', r.rows[0].total === 18, `actual=${r.rows[0].total}`);
  check('module_roles distinct roles (2)', r.rows[0].roles === 2, `actual=${r.rows[0].roles}`);

  // 4. ui_service_registry size aligned with ports.allocation.json
  const portsJson = JSON.parse(fs.readFileSync(
    path.resolve('platform/config-center/ops/ports.allocation.json'), 'utf8'));
  const expected = Object.keys(portsJson.services || {}).length;
  const reg = await pool.query(`SELECT COUNT(*)::int AS c FROM dos.ui_service_registry`);
  check(`ui_service_registry count == ports.json (${expected})`,
    reg.rows[0].c === expected, `db=${reg.rows[0].c}`);

  const px = await pool.query(`SELECT COUNT(*)::int AS c FROM dos.ui_service_registry_prefixes`);
  check('ui_service_registry_prefixes > 0', px.rows[0].c > 0, `count=${px.rows[0].c}`);

  // 5. FK soundness — every non-null module_code maps to a DNA row
  const orphan = await pool.query(
    `SELECT s.service_code, s.module_code
       FROM dos.ui_service_registry s
       LEFT JOIN dos.dynamic_ui_modules m ON m.module_code = s.module_code
      WHERE s.module_code IS NOT NULL AND m.module_code IS NULL`,
  );
  check('no orphan module_code in ui_service_registry',
    orphan.rows.length === 0,
    orphan.rows.length ? JSON.stringify(orphan.rows) : null);

  // 6. 6NF invariant — no ARRAY columns
  const arr = await pool.query(
    `SELECT format('%I.%I.%I', table_schema, table_name, column_name) AS col
       FROM information_schema.columns
      WHERE table_schema='dos'
        AND table_name IN ('dynamic_ui_modules','dynamic_ui_navigation',
                           'platform_admin_module_roles','ui_service_registry',
                           'ui_service_registry_prefixes')
        AND data_type='ARRAY'`,
  );
  check('6NF: no ARRAY columns on target tables',
    arr.rows.length === 0,
    arr.rows.length ? arr.rows.map(r => r.col).join(',') : null);

  // 8. W6 — multi-level UI-OS catalog tables exist + are 6NF
  const W6_TABLES = [
    'dynamic_ui_notification_templates','dynamic_ui_search_scopes',
    'dynamic_ui_command_palette_actions','dynamic_ui_help_articles',
    'dynamic_ui_breadcrumb_resolvers','dynamic_ui_filters',
    'dynamic_ui_filter_enum_values','dynamic_ui_workflow_templates',
    'product_brand_tokens','product_locales','product_enabled_modules',
    'product_module_overrides','product_navigation_overrides',
    'module_manifests','module_manifest_permissions','module_capabilities',
    'module_tenant_overrides','module_health_endpoints',
    'tenant_brand_tokens','tenant_locales','tenant_workflow_overrides',
    'ui_user_pinned_actions','ui_user_accessibility_prefs','ui_user_setting_flags',
    'service_endpoints','service_event_topics','service_data_contracts',
    'service_health_probes',
  ];
  const tbl = await pool.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema='dos' AND table_name = ANY($1::text[])`,
    [W6_TABLES],
  );
  const tblHave = new Set(tbl.rows.map(r => r.table_name));
  for (const name of W6_TABLES) {
    check(`W6 table dos.${name}`, tblHave.has(name));
  }
  const w6arr = await pool.query(
    `SELECT format('%I.%I.%I', table_schema, table_name, column_name) AS col
       FROM information_schema.columns
      WHERE table_schema='dos' AND table_name = ANY($1::text[]) AND data_type='ARRAY'`,
    [W6_TABLES],
  );
  check('W6: 6NF — no ARRAY columns on multi-level catalog',
    w6arr.rows.length === 0,
    w6arr.rows.length ? w6arr.rows.map(r => r.col).join(',') : null);

  // 9. W7 — platform inventory seed (0144)
  const W7_TABLES = [
    'module_manifests','module_manifest_permissions','module_capability_flags',
    'module_health_endpoints','service_health_probes','service_endpoints',
  ];
  const w7tbl = await pool.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema='dos' AND table_name = ANY($1::text[])`,
    [W7_TABLES],
  );
  const w7have = new Set(w7tbl.rows.map(r => r.table_name));
  for (const name of W7_TABLES) {
    check(`W7 table dos.${name}`, w7have.has(name));
  }

  const mm = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.module_manifests
      WHERE module_code = ANY($1::text[])`, [DNA_MODULES]);
  check('W7 module_manifests covers 9 DNA modules', mm.rows[0].c === 9, `actual=${mm.rows[0].c}`);

  const mp = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.module_manifest_permissions
      WHERE module_code = ANY($1::text[])`, [DNA_MODULES]);
  check('W7 module_manifest_permissions == 18', mp.rows[0].c === 18, `actual=${mp.rows[0].c}`);

  const mc = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.module_capability_flags
      WHERE module_code = ANY($1::text[])`, [DNA_MODULES]);
  check('W7 module_capability_flags >= 18', mc.rows[0].c >= 18, `actual=${mc.rows[0].c}`);

  const mh = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.module_health_endpoints
      WHERE module_code = ANY($1::text[])`, [DNA_MODULES]);
  check('W7 module_health_endpoints > 0', mh.rows[0].c > 0, `actual=${mh.rows[0].c}`);

  const sh = await pool.query(`SELECT COUNT(*)::int AS c FROM dos.service_health_probes`);
  check('W7 service_health_probes > 0', sh.rows[0].c > 0, `actual=${sh.rows[0].c}`);

  const se = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.service_endpoints
      WHERE service_code='ui-os-service' AND path_pattern LIKE '/api/ui-os/platform-admin/%'`);
  check('W7 service_endpoints — 4 platform-admin GETs', se.rows[0].c === 4, `actual=${se.rows[0].c}`);

  const w7arr = await pool.query(
    `SELECT format('%I.%I.%I', table_schema, table_name, column_name) AS col
       FROM information_schema.columns
      WHERE table_schema='dos' AND table_name = ANY($1::text[]) AND data_type='ARRAY'`,
    [W7_TABLES],
  );
  check('W7: 6NF — no ARRAY columns on inventory tables',
    w7arr.rows.length === 0,
    w7arr.rows.length ? w7arr.rows.map(r => r.col).join(',') : null);

  // 10. W8 — DAuth vertical slice (spec §10 Hard Gates) — DB layer.
  const w8r = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE page_type IS NOT NULL)::int AS with_page_type,
            COUNT(*) FILTER (WHERE layout    IS NOT NULL)::int AS with_layout,
            COUNT(*) FILTER (WHERE kpi_scope IS NOT NULL)::int AS with_kpi_scope,
            COUNT(*) FILTER (WHERE title_key IS NOT NULL)::int AS with_title_key
       FROM dos.dynamic_ui_routes
      WHERE module_code='dauth' AND tenant_id IS NULL`,
  );
  const w8 = w8r.rows[0];
  check('W8 dauth routes >= 5', w8.total >= 5, `actual=${w8.total}`);
  check('W8 every dauth route has page_type', w8.with_page_type === w8.total, `${w8.with_page_type}/${w8.total}`);
  check('W8 every dauth route has layout',    w8.with_layout    === w8.total, `${w8.with_layout}/${w8.total}`);
  check('W8 every dauth route has kpi_scope', w8.with_kpi_scope === w8.total, `${w8.with_kpi_scope}/${w8.total}`);
  check('W8 every dauth route has title_key', w8.with_title_key === w8.total, `${w8.with_title_key}/${w8.total}`);

  const w8bad = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_routes
      WHERE module_code='dauth' AND tenant_id IS NULL
        AND page_type <> 'overview' AND kpi_scope = 'module-overview'`,
  );
  check('W8 non-overview dauth routes carry no module-overview KPIs',
    w8bad.rows[0].c === 0, `bad=${w8bad.rows[0].c}`);

  const w8t = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_theme_tokens
      WHERE module_code='dauth' AND tenant_id IS NULL AND is_active = TRUE`);
  check('W8 dauth theme_tokens >= 6', w8t.rows[0].c >= 6, `actual=${w8t.rows[0].c}`);

  const w8k = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_kpis
      WHERE module_code='dauth' AND tenant_id IS NULL AND scope='module-overview'`);
  check('W8 dauth module-overview KPIs >= 5', w8k.rows[0].c >= 5, `actual=${w8k.rows[0].c}`);

  const w8a = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_actions
      WHERE module_code='dauth' AND tenant_id IS NULL AND is_active = TRUE`);
  check('W8 dauth actions >= 6', w8a.rows[0].c >= 6, `actual=${w8a.rows[0].c}`);

  const w8d = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_data_resources
      WHERE module_code='dauth' AND tenant_id IS NULL AND is_active = TRUE`);
  check('W8 dauth data_resources >= 10', w8d.rows[0].c >= 10, `actual=${w8d.rows[0].c}`);

  const w8i = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_i18n_keys
      WHERE module_code='dauth' AND en IS NOT NULL AND ar IS NOT NULL`);
  check('W8 dauth i18n keys (EN+AR) >= 21', w8i.rows[0].c >= 21, `actual=${w8i.rows[0].c}`);

  // 11. W8 — every dauth title_key/subtitle_key/label_key has an i18n row.
  const w8orph = await pool.query(
    `WITH refs AS (
       SELECT title_key AS k FROM dos.dynamic_ui_routes
        WHERE module_code='dauth' AND tenant_id IS NULL AND title_key IS NOT NULL
       UNION
       SELECT subtitle_key FROM dos.dynamic_ui_routes
        WHERE module_code='dauth' AND tenant_id IS NULL AND subtitle_key IS NOT NULL
       UNION
       SELECT label_key FROM dos.dynamic_ui_kpis
        WHERE module_code='dauth' AND tenant_id IS NULL AND label_key IS NOT NULL
       UNION
       SELECT label_key FROM dos.dynamic_ui_actions
        WHERE module_code='dauth' AND tenant_id IS NULL AND label_key IS NOT NULL
     )
     SELECT COUNT(*)::int AS c FROM refs r
       LEFT JOIN dos.dynamic_ui_i18n_keys i
              ON i.module_code='dauth' AND i.key_path = r.k
      WHERE i.key_path IS NULL`);
  check('W8 no orphan i18n key references in dauth contract',
    w8orph.rows[0].c === 0, `orphans=${w8orph.rows[0].c}`);

  // 12. W9 — DAuth experience layer (spec §7, §27, §26.1, §26.3, §26.6, §18.1).
  const w9tbl = await pool.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema='dos'
        AND table_name = ANY(ARRAY['dynamic_ui_page_headers','dynamic_ui_grid_columns','dynamic_ui_ai_tips'])`,
  );
  const w9have = new Set(w9tbl.rows.map(r => r.table_name));
  for (const t of ['dynamic_ui_page_headers','dynamic_ui_grid_columns','dynamic_ui_ai_tips']) {
    check(`W9 table dos.${t}`, w9have.has(t));
  }

  const w9sw = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_routes
      WHERE module_code='dauth' AND tenant_id IS NULL AND signature_widget IS NULL`);
  check('W9 §27 every dauth route has signature_widget', w9sw.rows[0].c === 0, `missing=${w9sw.rows[0].c}`);

  const w9wd = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_widgets
      WHERE module_code='dauth' AND tenant_id IS NULL AND is_signature = TRUE`);
  check('W9 §7 dauth signature widgets >= 5', w9wd.rows[0].c >= 5, `actual=${w9wd.rows[0].c}`);

  const w9ph = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_page_headers
      WHERE module_code='dauth' AND tenant_id = ''`);
  check('W9 §26.1 dauth page headers == 5', w9ph.rows[0].c === 5, `actual=${w9ph.rows[0].c}`);

  const w9gc = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_grid_columns
      WHERE module_code='dauth' AND tenant_id = ''`);
  check('W9 §26.3 dauth grid columns >= 22', w9gc.rows[0].c >= 22, `actual=${w9gc.rows[0].c}`);

  const w9pa = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_command_palette_actions
      WHERE module_code='dauth' AND registry_status='active'`);
  check('W9 §18.1 dauth command-palette actions >= 7', w9pa.rows[0].c >= 7, `actual=${w9pa.rows[0].c}`);

  const w9ss = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_search_scopes
      WHERE module_code='dauth' AND registry_status='active'`);
  check('W9 §18.1 dauth search scopes >= 4', w9ss.rows[0].c >= 4, `actual=${w9ss.rows[0].c}`);

  const w9ai = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_ai_tips
      WHERE module_code='dauth' AND tenant_id = ''`);
  check('W9 §26.6 dauth AI tips >= 3', w9ai.rows[0].c >= 3, `actual=${w9ai.rows[0].c}`);

  const w9arr = await pool.query(
    `SELECT format('%I.%I.%I', table_schema, table_name, column_name) AS col
       FROM information_schema.columns
      WHERE table_schema='dos'
        AND table_name = ANY(ARRAY['dynamic_ui_page_headers','dynamic_ui_grid_columns','dynamic_ui_ai_tips'])
        AND data_type='ARRAY'`);
  check('W9 6NF — no ARRAY columns on new tables',
    w9arr.rows.length === 0,
    w9arr.rows.length ? w9arr.rows.map(r => r.col).join(',') : null);

  // W9 — i18n coverage for new keys (page headers, grids, palette, scopes, tips)
  const w9orph = await pool.query(
    `WITH refs AS (
       SELECT eyebrow_key AS k FROM dos.dynamic_ui_page_headers WHERE module_code='dauth' AND tenant_id='' AND eyebrow_key IS NOT NULL
       UNION SELECT badge_key   FROM dos.dynamic_ui_page_headers WHERE module_code='dauth' AND tenant_id='' AND badge_key   IS NOT NULL
       UNION SELECT label_i18n_key FROM dos.dynamic_ui_grid_columns WHERE module_code='dauth' AND tenant_id=''
       UNION SELECT label_i18n_key FROM dos.dynamic_ui_command_palette_actions WHERE module_code='dauth'
       UNION SELECT label_i18n_key FROM dos.dynamic_ui_search_scopes WHERE module_code='dauth'
       UNION SELECT title_key   FROM dos.dynamic_ui_ai_tips WHERE module_code='dauth' AND tenant_id=''
       UNION SELECT body_key    FROM dos.dynamic_ui_ai_tips WHERE module_code='dauth' AND tenant_id=''
     )
     SELECT COUNT(*)::int AS c FROM refs r
       LEFT JOIN dos.dynamic_ui_i18n_keys i ON i.module_code='dauth' AND i.key_path = r.k
      WHERE i.key_path IS NULL`);
  check('W9 no orphan i18n key references in dauth experience layer',
    w9orph.rows[0].c === 0, `orphans=${w9orph.rows[0].c}`);

  // 13. W10 — all 9 DNA modules enrolled at W8+W9 depth.
  const W10_DNA = DNA_MODULES; // 9 modules
  for (const code of W10_DNA) {
    const r10 = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM dos.dynamic_ui_routes
            WHERE module_code=$1 AND tenant_id IS NULL) AS routes,
         (SELECT COUNT(*)::int FROM dos.dynamic_ui_kpis
            WHERE module_code=$1 AND tenant_id IS NULL AND scope='module-overview') AS kpis,
         (SELECT COUNT(*)::int FROM dos.dynamic_ui_actions
            WHERE module_code=$1 AND tenant_id IS NULL AND is_active=TRUE) AS actions,
         (SELECT COUNT(*)::int FROM dos.dynamic_ui_data_resources
            WHERE module_code=$1 AND tenant_id IS NULL AND is_active=TRUE) AS resources,
         (SELECT COUNT(*)::int FROM dos.dynamic_ui_page_headers
            WHERE module_code=$1 AND tenant_id='') AS headers,
         (SELECT COUNT(*)::int FROM dos.dynamic_ui_grid_columns
            WHERE module_code=$1 AND tenant_id='') AS columns,
         (SELECT COUNT(*)::int FROM dos.dynamic_ui_widgets
            WHERE module_code=$1 AND tenant_id IS NULL AND is_signature=TRUE) AS sig_widgets,
         (SELECT COUNT(*)::int FROM dos.dynamic_ui_routes
            WHERE module_code=$1 AND tenant_id IS NULL AND signature_widget IS NULL) AS missing_sig
      `, [code]);
    const v = r10.rows[0];
    check(`W10 ${code} routes >= 5`,         v.routes >= 5,        `actual=${v.routes}`);
    check(`W10 ${code} module-KPIs >= 5`,    v.kpis >= 5,          `actual=${v.kpis}`);
    check(`W10 ${code} actions >= 6`,        v.actions >= 6,       `actual=${v.actions}`);
    check(`W10 ${code} data_resources >= 10`,v.resources >= 10,    `actual=${v.resources}`);
    check(`W10 ${code} page_headers >= 5`,   v.headers >= 5,       `actual=${v.headers}`);
    check(`W10 ${code} grid_columns >= 15`,  v.columns >= 15,      `actual=${v.columns}`);
    check(`W10 ${code} signature_widgets >= 5`, v.sig_widgets >= 5,`actual=${v.sig_widgets}`);
    check(`W10 ${code} every route has signature_widget`, v.missing_sig === 0, `missing=${v.missing_sig}`);
  }

  // 14. W11 — IBM Carbon component catalog (canonical, 100%).
  const w11tbl = await pool.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema='dos' AND table_name='ui_carbon_components'`);
  check('W11 table dos.ui_carbon_components exists', w11tbl.rows.length === 1);

  const w11n = await pool.query(`SELECT COUNT(*)::int AS c FROM dos.ui_carbon_components`);
  check('W11 ui_carbon_components catalog >= 55', w11n.rows[0].c >= 55, `actual=${w11n.rows[0].c}`);

  const w11core = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.ui_carbon_components
      WHERE carbon_key = ANY(ARRAY['button','table','tabs','modal','tiles',
        'breadcrumb','structured-list','ui-shell','grid','notification',
        'dropdown','search','pagination','dialog','tooltip','tag'])`);
  check('W11 catalog has 16 critical Carbon modules', w11core.rows[0].c === 16, `actual=${w11core.rows[0].c}`);

  const w11col = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='dos' AND table_name='dynamic_ui_component_registry'
        AND column_name = ANY(ARRAY['vendor','approval_status','carbon_key'])`);
  check('W11 component_registry has vendor/approval_status/carbon_key',
    w11col.rows.length === 3, `cols=${w11col.rows.map(r => r.column_name).join(',')}`);

  const w11un = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_component_registry
      WHERE approval_status = 'unapproved' AND vendor <> 'ibm-carbon'`);
  check('W11 no unapproved (non-Carbon) components in registry',
    w11un.rows[0].c === 0,
    w11un.rows[0].c ? `unapproved=${w11un.rows[0].c} (must wrap or remove)` : null);

  const w11ven = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_component_registry
      WHERE vendor = 'ibm-carbon' AND approval_status = 'approved'`);
  check('W11 component_registry has approved Carbon-backed rows', w11ven.rows[0].c > 0, `actual=${w11ven.rows[0].c}`);

  // 15. WO1 — IBM Products Page & Modal Patterns (50 rows, all blocked-react-only).
  const wo1cols = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='dos' AND table_name='ui_carbon_components'
        AND column_name = ANY(ARRAY['source_component_name','integration_mode','runtime_status',
          'angular_native','wrapper_required','stability','dynamic_ui_allowed','notes'])`);
  check('WO1 ui_carbon_components has 8 classification columns',
    wo1cols.rows.length === 8, `cols=${wo1cols.rows.length}`);

  const wo1n = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.ui_carbon_components
      WHERE package_name='@carbon/ibm-products' AND carbon_key LIKE 'product.%'`);
  check('WO1 IBM Products rows >= 50', wo1n.rows[0].c >= 50, `actual=${wo1n.rows[0].c}`);

  const wo1blk = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.ui_carbon_components
      WHERE package_name='@carbon/ibm-products'
        AND (runtime_status <> 'blocked-react-only'
          OR integration_mode <> 'react-only-reference'
          OR angular_native <> FALSE
          OR dynamic_ui_allowed <> FALSE)`);
  check('WO1 every IBM Products row is react-only/blocked/angular_native=FALSE/dyn_ui=FALSE',
    wo1blk.rows[0].c === 0, `bad=${wo1blk.rows[0].c}`);

  const wo1nat = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.ui_carbon_components
      WHERE package_name='carbon-components-angular'
        AND (integration_mode <> 'native-angular' OR runtime_status <> 'active'
          OR angular_native <> TRUE OR dynamic_ui_allowed <> TRUE)`);
  check('WO1 Phase-0 lock: all 58 native Angular rows are native-angular/active',
    wo1nat.rows[0].c === 0, `bad=${wo1nat.rows[0].c}`);

  // 16. Phase 1 — Carbon Charts Angular catalog (25 chart-type rows).
  const ph1n = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.ui_carbon_components
      WHERE package_name='@carbon/charts-angular' AND carbon_key LIKE 'chart.%'`);
  check('Phase 1 Carbon Charts rows >= 25', ph1n.rows[0].c >= 25, `actual=${ph1n.rows[0].c}`);

  const ph1cls = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.ui_carbon_components
      WHERE package_name='@carbon/charts-angular'
        AND (integration_mode <> 'angular-chart' OR runtime_status <> 'active'
          OR angular_native <> TRUE OR wrapper_required <> TRUE
          OR dynamic_ui_allowed <> FALSE)`);
  check('Phase 1 every chart row is angular-chart/active/wrapper-required/dyn_ui=FALSE',
    ph1cls.rows[0].c === 0, `bad=${ph1cls.rows[0].c}`);

  const ph1keys = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.ui_carbon_components
      WHERE carbon_key = ANY(ARRAY['chart.bar.simple','chart.bar.grouped','chart.bar.stacked',
        'chart.bar.lollipop','chart.bar.histogram','chart.line','chart.area','chart.area.stacked',
        'chart.boxplot','chart.bubble','chart.scatter','chart.pie','chart.donut','chart.gauge',
        'chart.meter','chart.treemap','chart.circle-pack','chart.tree','chart.alluvial',
        'chart.combo','chart.choropleth','chart.heatmap','chart.radar','chart.bullet','chart.wordcloud'])`);
  check('Phase 1 all 25 canonical chart-type keys present',
    ph1keys.rows[0].c === 25, `actual=${ph1keys.rows[0].c}`);

  const ph1wrap = await pool.query(
    `SELECT COUNT(*)::int AS c FROM dos.dynamic_ui_component_registry
      WHERE component_key='DosCarbonChart' AND vendor='ibm-carbon' AND approval_status='approved'`);
  check('Phase 1 DosCarbonChart wrapper registered + approved',
    ph1wrap.rows[0].c === 1, `actual=${ph1wrap.rows[0].c}`);

  if (SMOKE_HTTP) {
    const headers = { 'x-user-sub': 'verify', 'x-tenant-id': 'verify' };
    const fetchJson = async (p) => {
      const res = await fetch(`${UI_OS_BASE}${p}`, { headers });
      if (!res.ok) throw new Error(`${p} → ${res.status}`);
      return res.json();
    };
    try {
      const ms = await fetchJson('/api/ui-os/platform-admin/modules');
      check('HTTP /platform-admin/modules count==9', ms.count === 9, `actual=${ms.count}`);
      const sv = await fetchJson('/api/ui-os/platform-admin/services');
      check(`HTTP /platform-admin/services count==${expected}`, sv.count === expected, `actual=${sv.count}`);
      const nv = await fetchJson('/api/ui-os/platform-admin/navigation');
      check('HTTP /platform-admin/navigation count==14', nv.count === 14, `actual=${nv.count}`);
      const mr = await fetchJson('/api/ui-os/platform-admin/module-roles');
      check('HTTP /platform-admin/module-roles count==18', mr.count === 18, `actual=${mr.count}`);

      // W8 §10 — canonical Dynamic-UI contract endpoints over the gateway.
      const ct = await fetchJson('/api/dynamic-ui/contract/dauth');
      check('HTTP /api/dynamic-ui/contract/dauth has module', !!ct.module, ct.module ? null : 'missing');
      check('HTTP contract dauth.routes >= 5', Array.isArray(ct.routes) && ct.routes.length >= 5, `actual=${ct.routes?.length}`);
      check('HTTP contract dauth.theme >= 6',  Array.isArray(ct.theme)  && ct.theme.length  >= 6, `actual=${ct.theme?.length}`);
      check('HTTP contract dauth.kpis  >= 5',  Array.isArray(ct.kpis)   && ct.kpis.length   >= 5, `actual=${ct.kpis?.length}`);
      check('HTTP contract dauth.actions >= 6',Array.isArray(ct.actions)&& ct.actions.length>= 6, `actual=${ct.actions?.length}`);
      check('HTTP contract dauth.dataResources >= 10', Array.isArray(ct.dataResources) && ct.dataResources.length >= 10, `actual=${ct.dataResources?.length}`);
      check('HTTP contract dauth.i18n >= 21',  Array.isArray(ct.i18n)   && ct.i18n.length   >= 21, `actual=${ct.i18n?.length}`);
      const allRoutesHaveCriticals = (ct.routes || []).every(
        r => r.page_type && r.layout && r.kpi_scope && r.title_key);
      check('HTTP contract: every route has page_type/layout/kpi_scope/title_key', allRoutesHaveCriticals);

      // W9 — experience layer surfaces in the contract response
      const allRoutesHaveSig = (ct.routes || []).every(r => !!r.signature_widget);
      check('HTTP contract: every route has signature_widget', allRoutesHaveSig);
      check('HTTP contract dauth.widgets >= 5',
        Array.isArray(ct.widgets) && ct.widgets.length >= 5, `actual=${ct.widgets?.length}`);
      check('HTTP contract dauth.pageHeaders == 5',
        Array.isArray(ct.pageHeaders) && ct.pageHeaders.length === 5, `actual=${ct.pageHeaders?.length}`);
      check('HTTP contract dauth.gridColumns >= 22',
        Array.isArray(ct.gridColumns) && ct.gridColumns.length >= 22, `actual=${ct.gridColumns?.length}`);
      check('HTTP contract dauth.commandPaletteActions >= 7',
        Array.isArray(ct.commandPaletteActions) && ct.commandPaletteActions.length >= 7,
        `actual=${ct.commandPaletteActions?.length}`);
      check('HTTP contract dauth.searchScopes >= 4',
        Array.isArray(ct.searchScopes) && ct.searchScopes.length >= 4, `actual=${ct.searchScopes?.length}`);
      check('HTTP contract dauth.aiTips >= 3',
        Array.isArray(ct.aiTips) && ct.aiTips.length >= 3, `actual=${ct.aiTips?.length}`);

      const rc = await fetchJson('/api/dynamic-ui/route-catalog');
      check('HTTP /api/dynamic-ui/route-catalog has dauth routes',
        Array.isArray(rc.routes) && rc.routes.some(r => r.module_code === 'dauth'),
        `count=${rc.count}`);
    } catch (e) {
      failures.push(`✗ HTTP smoke failed: ${e.message}`);
    }
  }
} finally {
  await pool.end();
}

for (const line of [...oks, ...failures]) console.log(line);
console.log(`\n[ui:patch1:verify] ${oks.length} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
