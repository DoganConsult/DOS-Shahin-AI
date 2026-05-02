#!/usr/bin/env node
/**
 * ui-os-theme-token-guard — Wave 10e (§26 #12).
 *
 * Verifies the Carbon seed migration (0308) inserts ≥80 cds-* tokens at
 * scope='global' into dos.dynamic_ui_theme_tokens.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG  = path.join(ROOT, 'platform', 'dos', 'migrations', 'public', '20260501_0308_ui_os_carbon_seed.sql');

let errors = 0;
const fail = (m) => { console.error('[ui-os-theme-token-guard] FAIL', m); errors++; };

if (!fs.existsSync(MIG)) { fail('carbon seed migration missing'); process.exit(1); }
const sql = fs.readFileSync(MIG, 'utf8');
if (!/dos\.dynamic_ui_theme_tokens/.test(sql)) fail('migration does not target dos.dynamic_ui_theme_tokens');

const matches = [...sql.matchAll(/'cds-[a-z0-9_-]+'/g)];
if (matches.length < 80) fail(`expected ≥80 cds-* tokens, found ${matches.length}`);
if (!/scope = 'global'/.test(sql) || !/'global'/.test(sql)) fail('scope=global not enforced');

if (errors > 0) { console.error(`[ui-os-theme-token-guard] ${errors} error(s)`); process.exit(1); }
console.log(`[ui-os-theme-token-guard] OK — ${matches.length} cds-* tokens`);
