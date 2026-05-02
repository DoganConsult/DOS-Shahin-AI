#!/usr/bin/env node
/**
 * ui-os-audit-log-guard — Wave 10e (§26 #18).
 *
 * Verifies the admin manager writes to dos.ui_admin_activity_log on
 * every mutating action (create/submit/publish/rollback).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MGR  = path.join(ROOT, 'services', 'ui-os-service', 'src', 'managers', 'ui-os-admin.manager.ts');

let errors = 0;
const fail = (m) => { console.error('[ui-os-audit-log-guard] FAIL', m); errors++; };

if (!fs.existsSync(MGR)) { fail('admin manager missing'); process.exit(1); }
const txt = fs.readFileSync(MGR, 'utf8');
if (!/dos\.ui_admin_activity_log/.test(txt)) fail('admin manager does not write to ui_admin_activity_log');

for (const action of ['draft.create','draft.submit','draft.publish','version.rollback']) {
  if (!txt.includes(`'${action}'`)) fail(`audit action label missing: ${action}`);
}

if (errors > 0) { console.error(`[ui-os-audit-log-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-audit-log-guard] OK');
