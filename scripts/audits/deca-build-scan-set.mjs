#!/usr/bin/env node
/**
 * deca-build-scan-set.mjs
 *
 * Read-only. Builds the canonical file scan-set for the DECA enforcement audit.
 *
 * Output: docs/audits/deca-2026-04-27/scan-set.txt (one absolute path per line, sorted).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO = '/root/DOS-AIO';
const OUT = path.join(REPO, 'docs/audits/deca-2026-04-27/scan-set.txt');

const INCLUDE_ROOTS = [
  'services',
  'DOS Platform',
];

const EXCLUDE_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  'out-tsc',
  '.stryker-tmp',
  'coverage',
  '__generated__',
  '.next',
  '.turbo',
  '.cache',
  'build',
  '.angular',
  'tmp',
  'tests-output',
]);

// Skip any directory whose name *starts with* one of these prefixes (handles dist-*, etc.)
const EXCLUDE_DIR_PREFIXES = ['dist-', 'out-tsc-'];

const INCLUDE_EXTS = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.json']);

// We only want backend-y files. Frontend route files can re-appear later in a frontend audit.
// However we DO want module manifests + permissions/actions config files.
const FRONTEND_HINTS = ['/frontend/', '/spa/', '/products/shahin/', '/products/shahin-ai/app/', '/products/shahin-ai/website/', '/packages/frontend/'];

async function* walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(e.name)) continue;
      if (EXCLUDE_DIR_PREFIXES.some((p) => e.name.startsWith(p))) continue;
      yield* walk(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

function isFrontend(p) {
  return FRONTEND_HINTS.some((h) => p.includes(h));
}

function classify(p) {
  const lower = p.toLowerCase();
  if (lower.endsWith('.d.ts')) return null;
  const ext = path.extname(p);
  if (!INCLUDE_EXTS.has(ext)) return null;
  // Test files are kept but tagged so layer J can find them and other layers can ignore them.
  const isTest = /\.(test|spec|e2e)\.(c|m)?[jt]s$/.test(p);
  return { isTest, isFrontend: isFrontend(p) };
}

async function main() {
  const all = [];
  for (const root of INCLUDE_ROOTS) {
    const abs = path.join(REPO, root);
    for await (const file of walk(abs)) {
      const c = classify(file);
      if (!c) continue;
      // For backend audit, drop frontend trees entirely except for module-manifest discovery.
      if (c.isFrontend) continue;
      all.push(file);
    }
  }
  all.sort();
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, all.join('\n') + '\n', 'utf8');
  console.error(`scan-set: ${all.length} files written to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
