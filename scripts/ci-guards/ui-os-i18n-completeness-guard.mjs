#!/usr/bin/env node
/**
 * ui-os-i18n-completeness-guard — Wave 10e (§26 #9).
 *
 * Verifies the dos.ui_locales seed includes en + ar in 0302 migration.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG  = path.join(ROOT, 'platform', 'dos', 'migrations', 'public', '20260501_0302_ui_os_runtime_personalization.sql');

let errors = 0;
const fail = (m) => { console.error('[ui-os-i18n-completeness-guard] FAIL', m); errors++; };

if (!fs.existsSync(MIG)) { fail('runtime personalization migration missing'); process.exit(1); }
const sql = fs.readFileSync(MIG, 'utf8');
if (!/INSERT INTO dos\.ui_locales/i.test(sql)) fail('migration does not seed dos.ui_locales');
if (!/'en[-_]?US?'/i.test(sql) && !/'en'/i.test(sql)) fail('en locale not seeded');
if (!/'ar[-_]?SA'/i.test(sql) && !/'ar'/i.test(sql)) fail('ar locale not seeded');
if (!/'rtl'/i.test(sql)) fail('rtl direction not present in seed');

if (errors > 0) { console.error(`[ui-os-i18n-completeness-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-i18n-completeness-guard] OK');
