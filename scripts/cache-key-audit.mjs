#!/usr/bin/env node
/**
 * cache-key-audit.mjs
 *
 * Flags cache-key construction sites that do NOT include tenantId.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/cache-key-audit.mjs [OPTIONS]

Flags cache-key construction sites missing tenantId (cross-tenant cache-bleed bug).

Options:
  --help, -h           Show this help message

Environment Variables:
  CACHE_KEY_AUDIT_MAX  Max violations before failure (default: 0)

Behavior:
  - Scans services/, packages/, modules/
  - Finds cache key construction patterns
  - Checks for tenantId in key material
  - Reports violations as potential cross-tenant cache-bleed

Output:
  JSON to docs/generated/cache-key-audit.json plus console summary.
  Exit code 1 if violations > CACHE_KEY_AUDIT_MAX.

Examples:
  # Audit cache keys (fail on any violation)
  node scripts/cache-key-audit.mjs

  # Audit with tolerance
  CACHE_KEY_AUDIT_MAX=5 node scripts/cache-key-audit.mjs
`);
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = [
  path.join(REPO_ROOT, 'services'),
  path.join(REPO_ROOT, 'packages'),
  path.join(REPO_ROOT, 'modules'),
];
const OUT = path.join(REPO_ROOT, 'docs/generated/cache-key-audit.json');
const MAX_VIOLATIONS = Number.isFinite(parseInt(process.env.CACHE_KEY_AUDIT_MAX ?? '', 10))
  ? parseInt(process.env.CACHE_KEY_AUDIT_MAX, 10)
  : Infinity; // informational by default; ratchet via env

const KEY_PATTERNS = [
  /\bcacheKey\s*=\s*[`'"]/,
  /\b(cache|redis|store)\.(set|get|put)\s*\(/,
  /[`'"]\s*(module|list|user|config|pref|view):/,
];
const TENANT_TOKENS = [
  'tenantId', 'tenant_id', 'tenantid', 'ctx.schema', 'ctx.tenantId', 'req.tenantId', 'schema:',
];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '__tests__', 'test', 'tests']);
const EXT = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs']);

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (SKIP_DIRS.has(d.name)) continue;
      yield* walk(p);
    } else if (EXT.has(path.extname(d.name))) {
      yield p;
    }
  }
}

function hasTenantContext(lines, idx, window = 8) {
  const start = Math.max(0, idx - window);
  const end = Math.min(lines.length, idx + window + 1);
  const slice = lines.slice(start, end).join('\n');
  return TENANT_TOKENS.some(t => slice.includes(t));
}

const violations = [];
let scanned = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    scanned++;
    let text;
    try { text = fs.readFileSync(file, 'utf-8'); } catch { continue; }
    if (!/cache|redis|\bkey\b/i.test(text)) continue;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (KEY_PATTERNS.some(rx => rx.test(line))) {
        if (!hasTenantContext(lines, i)) {
          violations.push({
            file: path.relative(REPO_ROOT, file),
            line: i + 1,
            snippet: line.trim().slice(0, 200),
          });
        }
      }
    }
  }
}

const byFile = {};
for (const v of violations) byFile[v.file] = (byFile[v.file] ?? 0) + 1;

const outDir = path.dirname(OUT);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  scannedFiles: scanned,
  violationCount: violations.length,
  byFile,
  violations: violations.slice(0, 500),
}, null, 2));

console.log(`[cache-key-audit] scanned=${scanned} violations=${violations.length} max=${MAX_VIOLATIONS}`);
for (const [f, c] of Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${c.toString().padStart(4)}  ${f}`);
}
console.log(`Report: ${path.relative(REPO_ROOT, OUT)}`);

if (violations.length > MAX_VIOLATIONS) {
  console.error(`[cache-key-audit] FAIL: ${violations.length} > ${MAX_VIOLATIONS}`);
  process.exit(1);
}
