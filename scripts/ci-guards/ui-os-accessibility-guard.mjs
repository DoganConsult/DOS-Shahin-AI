#!/usr/bin/env node
/**
 * ui-os-accessibility-guard — Wave 10e (§26 #13).
 *
 * Verifies @dos/ui-os-client declares accessibility-relevant preference
 * shapes (direction, density, appearance) and that the preferences manager
 * exposes them as canonical fields.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = path.join(ROOT, 'platform', 'ui-system', 'dos-ui-os-client', 'src', 'ui-os.types.ts');
const PREFS = path.join(ROOT, 'services', 'ui-os-service', 'src', 'managers', 'ui-os-preference.manager.ts');

let errors = 0;
const fail = (m) => { console.error('[ui-os-accessibility-guard] FAIL', m); errors++; };

if (!fs.existsSync(TYPES)) { fail('client types missing'); process.exit(1); }
const t = fs.readFileSync(TYPES, 'utf8');
for (const f of ['direction', 'density', 'appearance']) {
  if (!new RegExp(`\\b${f}\\b`).test(t)) fail(`UiOsPreferences missing field: ${f}`);
}

if (fs.existsSync(PREFS)) {
  const p = fs.readFileSync(PREFS, 'utf8');
  for (const f of ['direction', 'density', 'appearance']) {
    if (!p.includes(f)) fail(`preference manager does not handle ${f}`);
  }
}

if (errors > 0) { console.error(`[ui-os-accessibility-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-accessibility-guard] OK');
