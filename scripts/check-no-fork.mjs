#!/usr/bin/env node
/**
 * check-no-fork.mjs
 *
 * CI guard for the 5-brain architecture cleanup (see
 * docs/plans/need-to-clean-the-swift-trinket.md).
 *
 * Fails if any of the known forked DAuth/SoD/access-snapshot trees reintroduce
 * real implementations instead of remaining as re-export shims to the canonical
 * source at platform/dauth/packages/core/*.
 *
 * A shim is any file whose non-comment, non-blank content is either:
 *   - a single `export * from '<canonical>'` / `export { ... } from '<canonical>'`
 *   - or ≤ MAX_SHIM_LOC code lines of type re-exports / trivial wrappers
 *
 * Usage:
 *   node scripts/check-no-fork.mjs
 *   MAX_SHIM_LOC=15 node scripts/check-no-fork.mjs   # ratchet if needed
 *
 * Exit codes:
 *   0 — all fork paths are shims (or absent)
 *   1 — at least one fork reintroduced implementation code
 *   2 — harness error
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_SHIM_LOC = Number.isFinite(parseInt(process.env.MAX_SHIM_LOC ?? '', 10))
  ? parseInt(process.env.MAX_SHIM_LOC, 10)
  : 10;

// Paths that MUST be shims (relative to repo root).
// Directories are recursed; files are checked directly.
//
// IMPORTANT: dauth-shared/src/sod/agent-sod-engine.ts is INTENTIONALLY NOT a
// fork — it is the de-facto canonical because the dauth-shared barrel is the
// only export surface for `evaluateAgentSod` and dauth-core depends on
// dauth-shared (dep direction would create a cycle if reversed). The
// duplicate at core/sod/agent-sod-engine.ts is the fork instead.
const FORK_PATHS = [
  // SoD forks (still in tree as shims).
  'platform/dauth/packages/core/sod/agent-sod-engine.ts',
  'platform/dauth/services/auth-service/src/sod',

  // Phase J-3 deletion: the four large fork trees below were collapsed and
  // their files deleted. Paths are kept here as ratchet guards: if anyone
  // re-creates files under these directories, the guard fires immediately.
  // collectFiles() returns [] for non-existent paths, so this is a no-op
  // until that day comes.
  'modules/workflow/source/ai/sod',                     // dir removed; ratchet only
  'modules/workflow/source/data/workflow-templates',    // dir removed; ratchet only
  'services/ai-engine-service/src/runtime/ai/runtime/ai',
  'services/gateway/src/domain/routing/route-catalogs', // KEEP root: index.ts + identity/token.ts are LIVE; helper auto-skips small files
];

// File patterns to INCLUDE (only inspect real source, skip build output / tests).
const SRC_EXT = new Set(['.ts', '.tsx', '.mts', '.cts']);
const EXCLUDE_SUFFIX = [
  '.d.ts',
  '.js',
  '.js.map',
  '.d.ts.map',
  '.test.ts',
  '.spec.ts',
];
const EXCLUDE_DIRS = new Set(['dist', 'node_modules', '__tests__']);

/** Return array of absolute file paths to inspect under a fork root. */
function collectFiles(root) {
  const abs = path.join(REPO_ROOT, root);
  if (!existsSync(abs)) return [];
  const out = [];
  (function walk(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (EXCLUDE_DIRS.has(e.name)) continue;
        walk(path.join(dir, e.name));
      } else if (e.isFile()) {
        const full = path.join(dir, e.name);
        const ext = path.extname(full);
        if (!SRC_EXT.has(ext)) continue;
        if (EXCLUDE_SUFFIX.some((s) => full.endsWith(s))) continue;
        out.push(full);
      }
    }
  })(statSync(abs).isDirectory() ? abs : path.dirname(abs));
  if (statSync(abs).isFile()) return [abs];
  return out;
}

/**
 * Count "implementation" LOC — lines that aren't blank, pure comments, import
 * statements, or trivial re-exports. Returns { loc, lines: string[] }.
 */
function countImplLoc(src) {
  const stripped = src
    // block comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // line comments
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const lines = stripped.split('\n').map((l) => l.trim()).filter(Boolean);
  const implLines = lines.filter((l) => {
    if (l.startsWith('import ') || l.startsWith('import(')) return false;
    if (l.startsWith('export * from')) return false;
    if (l.startsWith('export { ') && l.includes(' from ')) return false;
    if (l.startsWith('export type ') && l.includes(' from ')) return false;
    if (l.startsWith('export default ') && /export default \w+;?$/.test(l)) return false;
    // Allow trivial constant shims like: export const X = Y;
    if (/^export (const|let|var) \w+\s*=\s*[\w.]+;?$/.test(l)) return false;
    return true;
  });
  return { loc: implLines.length, implLines };
}

const violations = [];
const inspected = [];

for (const fork of FORK_PATHS) {
  const files = collectFiles(fork);
  for (const f of files) {
    const rel = path.relative(REPO_ROOT, f);
    const src = readFileSync(f, 'utf-8');
    const { loc, implLines } = countImplLoc(src);
    inspected.push({ rel, loc });
    if (loc > MAX_SHIM_LOC) {
      violations.push({ rel, loc, preview: implLines.slice(0, 3) });
    }
  }
}

const summary = {
  maxShimLoc: MAX_SHIM_LOC,
  forksChecked: FORK_PATHS.length,
  filesInspected: inspected.length,
  violations: violations.length,
};

if (violations.length === 0) {
  console.log(`[check-no-fork] OK — ${inspected.length} files across ${FORK_PATHS.length} fork paths are within ≤${MAX_SHIM_LOC} impl LOC.`);
  process.exit(0);
}

console.error(`[check-no-fork] FAIL — ${violations.length} file(s) exceed ${MAX_SHIM_LOC} impl LOC:\n`);
for (const v of violations) {
  console.error(`  ${v.rel}  (${v.loc} LOC)`);
  for (const line of v.preview) console.error(`      | ${line.slice(0, 100)}`);
}
console.error(`\nSummary: ${JSON.stringify(summary)}`);
console.error(`\nFix: replace the implementation with a re-export from the canonical path, or`);
console.error(`     raise MAX_SHIM_LOC (discouraged) and document why in the plan file.`);
process.exit(1);
