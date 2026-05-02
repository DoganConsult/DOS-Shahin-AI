#!/usr/bin/env node
/**
 * Verify referenced qiyas permission codes exist in catalog.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (['node_modules', 'dist', 'ui', '.git', '_sources'].includes(f)) continue;
      walk(p, out);
    } else if (/\.(ts|mjs|js)$/.test(f)) {
      out.push(p);
    }
  }
  return out;
}

const PERM_RE = /'(qiyas[:\.][a-z0-9_:.\-*]+)'/gi;
const CALLSITE_RE = /(requirePermission|requireAnyPermission|requireAllPermissions|hasPermission|permission|permissions|permissionCode)\s*\(?\s*['"]([^'"]+)['"]/gi;

const catalog = new Set();
for (const rel of [
  'contracts/qiyas.permissions.ts',
  'contracts/qiyas.contract.ts',
  'interface/security',
]) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) continue;
  const stat = statSync(p);
  const files = stat.isDirectory() ? walk(p) : [p];
  for (const f of files) {
    try {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(PERM_RE)) catalog.add(m[1]);
    } catch {}
  }
}

const referenced = new Set();
for (const file of walk(ROOT)) {
  if (file.includes('/interface/security/')) continue;
  if (file.includes('/contracts/qiyas.contract')) continue;
  if (file.includes('/contracts/qiyas.permissions')) continue;
  if (file.includes('/ops/scripts/')) continue;
  if (file.includes('/tests/')) continue;
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(CALLSITE_RE)) {
    const code = m[2];
    if (/^qiyas[:\.]/i.test(code)) referenced.add(code);
  }
}

const missing = [...referenced].filter((p) => !catalog.has(p) && !p.endsWith(':*'));
console.log(`[verify-permissions] catalog=${catalog.size} referenced=${referenced.size}`);
if (missing.length) {
  console.error(`[verify-permissions] MISSING IN CATALOG (${missing.length}):`, missing.slice(0, 20));
  process.exit(1);
}
console.log('[verify-permissions] OK');
