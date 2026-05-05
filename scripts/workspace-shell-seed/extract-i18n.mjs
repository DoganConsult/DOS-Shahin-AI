import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = fs.readFileSync(
  join(repoRoot, 'products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts'),
  'utf8',
);
const lines = src.split('\n');
const startIdx = lines.findIndex(l => l.startsWith('const I18N'));
if (startIdx < 0) { console.error('I18N not found'); process.exit(1); }
const out = { en: {}, ar: {} };
let cur = null;
let depth = 0;
for (let i = startIdx; i < lines.length; i++) {
  const l = lines[i];
  const t = l.trim();
  if (/^en:\s*\{/.test(t)) { cur = 'en'; depth = 1; continue; }
  if (/^ar:\s*\{/.test(t)) { cur = 'ar'; depth = 1; continue; }
  if (cur && /^\}\s*,?\s*$/.test(t)) { cur = null; depth = 0; continue; }
  if (!cur) continue;
  const m = l.match(/^\s*['"]([^'"]+)['"]\s*:\s*(['"])(.*?)\2\s*,?\s*(\/\/.*)?$/);
  if (m) out[cur][m[1]] = m[3];
}
console.error(`EN keys: ${Object.keys(out.en).length}, AR keys: ${Object.keys(out.ar).length}`);
const ns = (k) => k.split('.')[0];
const esc = (s) => s.replace(/'/g, "''");
const rows = [];
for (const [loc, map] of Object.entries(out)) {
  for (const [k, v] of Object.entries(map)) {
    rows.push(`('${loc}', '${esc(ns(k))}', '${esc(k)}', '${esc(v)}')`);
  }
}
console.log('-- Auto-generated from workspace-resolver.service.ts I18N maps');
console.log(`-- Rows: ${rows.length}`);
console.log('BEGIN;');
const CHUNK = 200;
for (let i = 0; i < rows.length; i += CHUNK) {
  const part = rows.slice(i, i + CHUNK);
  console.log('INSERT INTO dos.ui_translations (locale_code, namespace, translation_key, translation_value) VALUES');
  console.log(part.join(',\n'));
  console.log("ON CONFLICT (locale_code, namespace, translation_key, COALESCE(tenant_id,'*')) DO UPDATE SET translation_value=EXCLUDED.translation_value, updated_at=NOW();");
}
console.log('COMMIT;');
