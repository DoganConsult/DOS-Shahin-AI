#!/usr/bin/env node
/**
 * Verify that every permission code referenced in HTTP routes exists
 * in the canonical permission catalog (contracts/foundation.permissions.ts).
 * Exit code 1 on drift.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (['node_modules', 'dist', 'ui', '.git'].includes(f)) continue;
      walk(p, out);
    } else if (/\.(ts|mjs|js)$/.test(f)) {
      out.push(p);
    }
  }
  return out;
}

// Permission code regex — accepts both colon-form and dot-form.
const PERM_RE = /'(foundation[:\.][a-z0-9_:.\-*]+)'/gi;
// Scan for usages only inside permission-checking call sites (so event names
// like 'foundation.position.created' are not confused with permissions).
const CALLSITE_RE = /(requirePermission|requireAnyPermission|requireAllPermissions|hasPermission|permission|permissions|permissionCode)\s*\(?\s*['"]([^'"]+)['"]/gi;

const catalog = new Set();
for (const rel of [
  'contracts/foundation.permissions.ts',
  'interface/security/foundation.permissions.ts',
  'interface/security/foundation.security.ts',
  'interface/security/foundation.actions.ts',
]) {
  try {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    for (const m of src.matchAll(PERM_RE)) catalog.add(m[1]);
  } catch {}
}

const referenced = new Set();
for (const file of walk(ROOT)) {
  if (file.includes('/contracts/foundation.permissions.ts')) continue;
  if (file.includes('/interface/security/')) continue;
  if (file.includes('/ops/scripts/')) continue;
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(CALLSITE_RE)) {
    const code = m[2];
    if (/^foundation[:\.]/i.test(code)) referenced.add(code);
  }
}

const missing = [...referenced].filter((p) => !catalog.has(p) && !p.endsWith(':*'));
const unused = [...catalog].filter((p) => !referenced.has(p));

console.log(`[verify-permissions] catalog=${catalog.size} referenced=${referenced.size}`);
if (unused.length) console.log(`[verify-permissions] unused (${unused.length}):`, unused);
if (missing.length) {
  console.error(`[verify-permissions] MISSING IN CATALOG (${missing.length}):`, missing);
  process.exit(1);
}
console.log('[verify-permissions] OK');
