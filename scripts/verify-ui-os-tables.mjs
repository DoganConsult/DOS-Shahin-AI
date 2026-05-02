#!/usr/bin/env node
// =====================================================================
// verify-ui-os-tables.mjs
//
// Verifies the UI-OS migration deltas applied by:
//   - 20260501_0302_ui_os_runtime_personalization.sql  (10 tables)
//   - 20260501_0303_ui_os_workspace_productivity.sql   (7 tables)
//
// Also asserts that the pre-existing dynamic_ui catalog (20260501_0300)
// still owns app/widget/action/navigation — we must never duplicate it.
//
// Usage:  DATABASE_URL=postgres://... node scripts/verify-ui-os-tables.mjs
// =====================================================================

import pg from 'pg';

const { Client } = pg;

const RUNTIME_TABLES = [
  'ui_user_preferences',
  'ui_dashboards',
  'ui_dashboard_widgets',
  'ui_workspace_states',
  'ui_data_grid_states',
  'ui_tenant_branding',
  'ui_locales',
  'ui_translations',
  'ui_tours',
  'ui_user_tours_completed',
];

const PRODUCTIVITY_TABLES = [
  'ui_saved_views',
  'ui_pinned_items',
  'ui_recent_items',
  'ui_command_palette_items',
  'ui_user_shortcuts',
  'ui_announcements',
  'ui_user_announcements_read',
];

// Wave 2a — productivity tail (0304)
const PRODUCTIVITY_TAIL_TABLES = [
  'ui_saved_filters',
  'ui_favorites',
  'ui_quick_actions',
  'ui_context_menus',
  'ui_bulk_actions',
];

// Wave 2b — layout & composition (0305)
const LAYOUT_TABLES = [
  'ui_layout_templates',
  'ui_user_layout_overrides',
  'ui_page_layouts',
  'ui_page_sections',
  'ui_section_widgets',
  'ui_responsive_breakpoints',
  'ui_layout_versions',
  'ui_layout_publish_history',
];

const REQUIRED_DYNAMIC_UI = [
  'dynamic_ui_modules',
  'dynamic_ui_widgets',
  'dynamic_ui_actions',
  'dynamic_ui_navigation',
];

const FORBIDDEN_DUPLICATES = [
  'os_applications',
  'os_widgets',
  'os_actions',
  'ui_navigation_nodes',
];

async function tableExists(client, schema, name) {
  const { rows } = await client.query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2`,
    [schema, name],
  );
  return rows.length > 0;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(2);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  const failures = [];

  try {
    // 1. runtime + productivity (+ tail + layout) must exist in dos schema
    for (const t of [
      ...RUNTIME_TABLES,
      ...PRODUCTIVITY_TABLES,
      ...PRODUCTIVITY_TAIL_TABLES,
      ...LAYOUT_TABLES,
    ]) {
      if (!(await tableExists(client, 'dos', t))) {
        failures.push(`MISSING dos.${t}`);
      }
    }

    // 2. existing dynamic_ui catalog must still exist
    for (const t of REQUIRED_DYNAMIC_UI) {
      if (!(await tableExists(client, 'dos', t))) {
        failures.push(`MISSING canonical dos.${t}`);
      }
    }

    // 3. forbidden duplicates must NOT exist anywhere
    for (const t of FORBIDDEN_DUPLICATES) {
      const { rows } = await client.query(
        `SELECT table_schema
           FROM information_schema.tables
          WHERE table_name = $1`,
        [t],
      );
      if (rows.length > 0) {
        failures.push(
          `FORBIDDEN DUPLICATE ${t} present in: ${rows.map((r) => r.table_schema).join(', ')}`,
        );
      }
    }

    // 4. ui_locales must contain en + ar
    const locales = await client.query(
      `SELECT locale_code, direction FROM dos.ui_locales WHERE locale_code IN ('en','ar')`,
    );
    const seenLocales = new Set(locales.rows.map((r) => r.locale_code));
    if (!seenLocales.has('en')) failures.push('SEED MISSING dos.ui_locales:en');
    if (!seenLocales.has('ar')) failures.push('SEED MISSING dos.ui_locales:ar');
    const ar = locales.rows.find((r) => r.locale_code === 'ar');
    if (ar && ar.direction !== 'rtl') failures.push('dos.ui_locales:ar must have direction=rtl');
    const en = locales.rows.find((r) => r.locale_code === 'en');
    if (en && en.direction !== 'ltr') failures.push('dos.ui_locales:en must have direction=ltr');

    // 5. summary
    console.log(JSON.stringify({
      runtime_tables: RUNTIME_TABLES.length,
      productivity_tables: PRODUCTIVITY_TABLES.length,
      productivity_tail_tables: PRODUCTIVITY_TAIL_TABLES.length,
      layout_tables: LAYOUT_TABLES.length,
      dynamic_ui_required: REQUIRED_DYNAMIC_UI.length,
      forbidden_duplicates_checked: FORBIDDEN_DUPLICATES.length,
      seeded_locales: [...seenLocales],
      failures,
    }, null, 2));

    if (failures.length > 0) {
      console.error(`\nFAILED — ${failures.length} issue(s).`);
      process.exit(1);
    }
    console.log('\nOK — UI-OS table gap closed.');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
