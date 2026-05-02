#!/usr/bin/env node
/**
 * ui-os-dashboard-layout-guard — Wave 10e (§26 #14).
 *
 * Verifies dos.ui_dashboard_widgets has grid-layout columns (x, y, w, h)
 * declared in the runtime personalization migration.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG  = path.join(ROOT, 'platform', 'dos', 'migrations', 'public', '20260501_0302_ui_os_runtime_personalization.sql');

let errors = 0;
const fail = (m) => { console.error('[ui-os-dashboard-layout-guard] FAIL', m); errors++; };

if (!fs.existsSync(MIG)) { fail('runtime personalization migration missing'); process.exit(1); }
const sql = fs.readFileSync(MIG, 'utf8');
const idx = sql.indexOf('CREATE TABLE IF NOT EXISTS dos.ui_dashboard_widgets');
if (idx < 0) { fail('ui_dashboard_widgets not declared'); process.exit(1); }
const block = sql.slice(idx, idx + 2000);
for (const col of ['x', 'y', 'w', 'h', 'instance_config', 'data_binding']) {
  if (!new RegExp(`\\b${col}\\b`).test(block)) fail(`ui_dashboard_widgets missing column: ${col}`);
}

if (errors > 0) { console.error(`[ui-os-dashboard-layout-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-dashboard-layout-guard] OK');
