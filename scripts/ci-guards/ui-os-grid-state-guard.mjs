#!/usr/bin/env node
/**
 * ui-os-grid-state-guard — Wave 10e (§26 #15).
 *
 * Verifies dos.ui_data_grid_states has column_state, sort_state, filter_state,
 * pagination_state JSONB columns + (tenant_id, user_id, grid_key) UNIQUE.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG  = path.join(ROOT, 'platform', 'dos', 'migrations', 'public', '20260501_0302_ui_os_runtime_personalization.sql');

let errors = 0;
const fail = (m) => { console.error('[ui-os-grid-state-guard] FAIL', m); errors++; };

if (!fs.existsSync(MIG)) { fail('migration missing'); process.exit(1); }
const sql = fs.readFileSync(MIG, 'utf8');
const idx = sql.indexOf('CREATE TABLE IF NOT EXISTS dos.ui_data_grid_states');
if (idx < 0) { fail('ui_data_grid_states not declared'); process.exit(1); }
const block = sql.slice(idx, idx + 2500);
for (const col of ['column_state', 'sort_state', 'filter_state', 'pagination_state']) {
  if (!block.includes(`${col}`)) fail(`ui_data_grid_states missing column: ${col}`);
}
if (!/UNIQUE\s*\(\s*tenant_id\s*,\s*user_id\s*,\s*grid_key\s*\)/i.test(block)) {
  fail('missing UNIQUE (tenant_id, user_id, grid_key) on ui_data_grid_states');
}

if (errors > 0) { console.error(`[ui-os-grid-state-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-grid-state-guard] OK');
