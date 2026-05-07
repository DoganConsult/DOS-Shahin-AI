#!/usr/bin/env node
/**
 * Untyped Shell Action Guard
 *
 * Fails when any DB row that emits a ShellAction (chrome / menus / shortcuts /
 * banners / quick-actions) carries an action_json without a typed `kind`.
 *
 * Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK.
 *           Every action surface must be typed at the DB boundary so the
 *           UI-OS resolver can normalize without inventing fields.
 *
 * Exit codes:
 *   0 — all shell.*.action sources typed
 *   1 — untyped row(s) detected
 *   2 — DB connection error
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-no-untyped-shell-action.mjs [OPTIONS]

Environment:
  DATABASE_URL  PostgreSQL connection string
                (default: postgresql://shahin:shahin_grc_2024@127.0.0.1:5432/shahin_grc)

Sources scanned (action_json must contain a string 'kind'):
  - dos.ui_workspace_chrome           (chrome_key LIKE 'shell.%.action')
  - dos.workspace_user_menu_items     (action_json)
  - dos.workspace_settings_menu_items (action_json)
  - dos.workspace_global_quick_actions(action_json)
  - dos.ui_workspace_shortcut         (action_json)
  - dos.ui_workspace_banner           (action_json when not null)
`);
  process.exit(0);
}

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL
  || 'postgresql://shahin:shahin_grc_2024@127.0.0.1:5432/shahin_grc';

const pool = new Pool({ connectionString: DATABASE_URL });

const ALLOWED_KINDS = new Set([
  'navigate', 'open_external', 'toggle_language', 'toggle_theme',
  'open_context_tab', 'open_command', 'close_overlay', 'clear_error',
  'dispatch_event',
]);

const QUERIES = [
  {
    source: 'dos.ui_workspace_chrome (shell.*.action)',
    sql: `SELECT tenant_id, chrome_key AS id, value_json AS action_json
            FROM dos.ui_workspace_chrome
           WHERE enabled = true
             AND chrome_key LIKE 'shell.%.action'`,
  },
  {
    source: 'dos.workspace_user_menu_items',
    sql: `SELECT tenant_id, item_id AS id, action_json
            FROM dos.workspace_user_menu_items
           WHERE enabled = true`,
  },
  {
    source: 'dos.workspace_settings_menu_items',
    sql: `SELECT tenant_id, item_id AS id, action_json
            FROM dos.workspace_settings_menu_items
           WHERE enabled = true`,
  },
  {
    source: 'dos.workspace_global_quick_actions',
    sql: `SELECT tenant_id, item_id AS id, action_json
            FROM dos.workspace_global_quick_actions
           WHERE enabled = true`,
  },
  {
    source: 'dos.ui_workspace_shortcut',
    sql: `SELECT tenant_id, shortcut_id AS id, action_json
            FROM dos.ui_workspace_shortcut
           WHERE enabled = true`,
  },
  {
    source: 'dos.ui_workspace_banner',
    sql: `SELECT tenant_id, banner_id AS id, action_json
            FROM dos.ui_workspace_banner
           WHERE enabled = true AND action_json IS NOT NULL`,
  },
];

async function tableExists(name) {
  const [schema, table] = name.split('.');
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2`,
    [schema, table],
  );
  return r.rowCount > 0;
}

const offenders = [];
let scannedSources = 0;

try {
  for (const q of QUERIES) {
    const tbl = q.source.split(' ')[0];
    if (!(await tableExists(tbl))) continue;
    scannedSources += 1;
    const r = await pool.query(q.sql);
    for (const row of r.rows) {
      const a = row.action_json;
      const kind = a && typeof a === 'object' ? a.kind : null;
      if (typeof kind !== 'string' || !ALLOWED_KINDS.has(kind)) {
        offenders.push({
          source: q.source,
          tenant: row.tenant_id,
          id: row.id,
          reason: typeof kind !== 'string' ? 'missing-kind' : 'kind-not-allowed',
          kind,
        });
      }
    }
  }
} catch (e) {
  console.error(`[lint-no-untyped-shell-action] DB error: ${e.message}`);
  await pool.end();
  process.exit(2);
}

await pool.end();

if (offenders.length > 0) {
  console.error(`[lint-no-untyped-shell-action] FAIL — ${offenders.length} untyped shell action(s):`);
  for (const o of offenders.slice(0, 50)) {
    console.error(`  ${o.source} tenant=${o.tenant} id=${o.id} reason=${o.reason} kind=${JSON.stringify(o.kind)}`);
  }
  process.exit(1);
}

console.log(`[lint-no-untyped-shell-action] PASS — ${scannedSources} source(s) scanned, all action_json typed`);
process.exit(0);
