#!/usr/bin/env node
/**
 * dynamic-ui-loader-resolvability.mjs — Phase 1 CI gate
 *
 * For every entry in WIDGET_KEY_MAP and COMPONENT_MAP, verify:
 *   - The lazy-import target file exists on disk.
 *   - The named export exists in that file.
 *
 * Catches refactors that rename a component without updating the registry,
 * which would otherwise show up as a silent runtime "No widget configured…"
 * empty-state.
 *
 * Resolves @foundation-module/ui, @workflow-module/ui, etc., via the
 * tsconfig paths block in products/shahin-ai/app/tsconfig.json. Anything
 * unresolvable hard-fails this gate.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
process.chdir(repoRoot);

// Canonical registries live under platform/ (SPA resolves @app/shared/* → here).
const WIDGET_MAP_FILE =
  'platform/config-center/shared/dynamic-ui/registry/widget-key-map.ts';
const COMPONENT_MAP_FILE = 'platform/dos/registry/component-map.ts';
const SPA_TSCONFIG = 'products/shahin-ai/app/tsconfig.json';

// ─── tsconfig paths resolver ──────────────────────────────────────────────
function loadPathAliases() {
  const raw = readFileSync(SPA_TSCONFIG, 'utf8');
  const tsc = stripJsonComments(raw);
  let cfg;
  try { cfg = JSON.parse(tsc); }
  catch (e) {
    console.error(`[loader-resolvability] FAIL — could not parse ${SPA_TSCONFIG}: ${e.message}`);
    process.exit(1);
  }
  const baseUrl = cfg.compilerOptions?.baseUrl ?? '.';
  const paths = cfg.compilerOptions?.paths ?? {};
  return {
    baseDir: resolve(dirname(SPA_TSCONFIG), baseUrl),
    paths,
  };
}
// String-aware comment stripper. Naive regex versions corrupt glob patterns
// like "src/**/*.spec.ts" because /* … */ is greedy. We walk character-by-
// character, tracking whether we're inside a JSON string.
function stripJsonComments(src) {
  let out = '';
  let i = 0;
  let inStr = false;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (inStr) {
      out += ch;
      if (ch === '\\' && next !== undefined) { out += next; i += 2; continue; }
      if (ch === '"') inStr = false;
      i++; continue;
    }
    if (ch === '"') { inStr = true; out += ch; i++; continue; }
    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += ch; i++;
  }
  return out;
}
const tsconf = loadPathAliases();

// Sort aliases by descending specificity (longest non-wildcard prefix wins),
// matching TypeScript's path resolution semantics. Otherwise a generic
// "@app/*" alias listed first in tsconfig swallows specifiers that should
// have routed to a more specific "@app/features/compliance/*" alias.
const SORTED_ALIASES = Object.entries(tsconf.paths).sort((a, b) => {
  const aPrefix = a[0].endsWith('/*') ? a[0].slice(0, -2) : a[0];
  const bPrefix = b[0].endsWith('/*') ? b[0].slice(0, -2) : b[0];
  if (bPrefix.length !== aPrefix.length) return bPrefix.length - aPrefix.length;
  // exact-match aliases beat wildcards of the same prefix length
  return Number(a[0].endsWith('/*')) - Number(b[0].endsWith('/*'));
});

function resolveSpecifier(spec, fromFile) {
  for (const [alias, targets] of SORTED_ALIASES) {
    const wildcard = alias.endsWith('/*');
    const aliasBase = wildcard ? alias.slice(0, -2) : alias;
    const matches = wildcard
      ? spec.startsWith(aliasBase + '/') || spec === aliasBase
      : spec === alias;
    if (!matches) continue;
    const tail = wildcard ? spec.slice(aliasBase.length + 1) : '';
    for (const t of targets) {
      const tBase = wildcard ? t.replace(/\/\*$/, '') : t;
      const candidate = wildcard ? join(tsconf.baseDir, tBase, tail) : join(tsconf.baseDir, tBase);
      const found = tryResolveFile(candidate);
      if (found) return found;
    }
    // Tried the most specific alias and its targets; only fall through to
    // the next alias if the spec did NOT match this one. Since it did
    // match, return null so we don't double-resolve via a less-specific
    // alias and silently ignore a real bug.
    return null;
  }
  const base = dirname(fromFile);
  return tryResolveFile(resolve(base, spec));
}
function tryResolveFile(p) {
  const candidates = [
    p, p + '.ts', p + '.tsx',
    join(p, 'index.ts'), join(p, 'index.tsx'),
  ];
  for (const c of candidates) {
    try { if (statSync(c).isFile()) return c; } catch { /* */ }
  }
  return null;
}

// ─── Parse map files: extract { key, importSpec, exportName } ─────────────
function extractEntries(file) {
  const src = readFileSync(file, 'utf8');
  // Captures:  'key': () => import('spec').then(m => m.ExportName ...)
  const re = /['"]([a-zA-Z0-9_.\-:/]+)['"]\s*:\s*\(\s*\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)\s*\.then\(\s*m\s*=>\s*m\.([A-Za-z0-9_$]+)/g;
  const out = [];
  let m; while ((m = re.exec(src))) out.push({ key: m[1], spec: m[2], exportName: m[3] });
  return out;
}

// ─── Validate: file exists + named export exists in source ────────────────
function namedExportExists(absFile, exportName) {
  // Tolerant scan: looks for `export class X`, `export const X`, `export function X`,
  // `export { X }`, `export { X as ... }`, or barrel re-exports (export * from ...).
  const src = readFileSync(absFile, 'utf8');
  const direct = new RegExp(
    `export\\s+(?:abstract\\s+)?(?:class|const|let|var|function|interface|type|enum)\\s+${exportName}\\b`,
  );
  if (direct.test(src)) return true;
  const named = new RegExp(`export\\s*\\{[^}]*\\b${exportName}\\b[^}]*\\}`);
  if (named.test(src)) return true;
  // Barrel: chase `export * from './x'` or `export { X } from './x'`
  const barrelRe = /export\s+(?:\*|\{[^}]+\})\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = barrelRe.exec(src))) {
    const child = resolveSpecifier(m[1], absFile);
    if (child && child !== absFile && namedExportExists(child, exportName)) return true;
  }
  return false;
}

// ─── Run ──────────────────────────────────────────────────────────────────
const targets = [
  { name: 'WIDGET_KEY_MAP', file: WIDGET_MAP_FILE, entries: extractEntries(WIDGET_MAP_FILE) },
  { name: 'COMPONENT_MAP',  file: COMPONENT_MAP_FILE, entries: extractEntries(COMPONENT_MAP_FILE) },
];

const failures = [];
let total = 0;
for (const t of targets) {
  for (const e of t.entries) {
    total++;
    const abs = resolveSpecifier(e.spec, t.file);
    if (!abs) {
      failures.push({ map: t.name, key: e.key, spec: e.spec, reason: 'unresolvable-import' });
      continue;
    }
    if (!namedExportExists(abs, e.exportName)) {
      failures.push({
        map: t.name, key: e.key, spec: e.spec, exportName: e.exportName,
        resolved: abs, reason: 'missing-named-export',
      });
    }
  }
}

console.log(`[loader-resolvability] checked ${total} entries · failures=${failures.length}`);
if (failures.length) {
  console.error('[loader-resolvability] FAIL — broken lazy-import entries:');
  for (const f of failures) console.error(`  - [${f.map}] ${f.key}  →  ${JSON.stringify(f)}`);
  process.exit(1);
}
console.log('[loader-resolvability] PASS — every registry entry resolves to a real export.');
process.exit(0);
