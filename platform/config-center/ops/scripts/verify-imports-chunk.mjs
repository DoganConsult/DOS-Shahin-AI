#!/usr/bin/env node
/**
 * Chunked dependency-cruiser runner.
 *
 * The full TS graph is too large for dependency-cruiser to resolve in a
 * single process (OOM at 8 GB heap). This script invokes dep-cruiser on a
 * single chunk (packages | services | modules | frontend) with an
 * include-only regex that restricts the walk to first-party `.ts` sources
 * — keeping stale compiled `.js` artifacts and `node_modules` out of
 * scope. Rules in `.dependency-cruiser.cjs` still apply.
 */
import { spawnSync } from 'node:child_process';
import { resolve, join, relative } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

const CHUNKS = {
  packages: {
    parent: 'packages',
    srcSuffix: 'src',
  },
  services: {
    parent: 'services',
    srcSuffix: 'src',
  },
  modules: {
    parent: 'modules',
    srcSuffix: 'source/backend',
  },
  frontend: {
    parent: 'frontend/products',
    srcSuffix: 'src',
  },
  // Platform modules (DOS, DAuth, DSOC, DNOC) live under platform/<module>/
  // with packages/<pkg>/src and services/<svc>/src layouts. The chunk model
  // below uses an explicit roots list so the dependency-cruiser walk includes
  // platform module sources and isolation rules (e.g. dauth-isolation) fire.
  platform: {
    explicitRoots: [
      'platform/dauth/packages/core',
      'platform/dauth/packages/shared/src',
      'platform/dauth/services/auth-service/src',
    ],
  },
};

const chunkName = process.argv[2];
const chunk = CHUNKS[chunkName];
if (!chunk) {
  console.error(`verify-imports-chunk: unknown chunk '${chunkName}'. Expected one of: ${Object.keys(CHUNKS).join(', ')}`);
  process.exit(2);
}

const repoRoot = resolve(process.cwd());

function collectTsFiles(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '__tests__' || e.name === '.angular') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      collectTsFiles(full, acc);
    } else if (e.isFile() && full.endsWith('.ts') && !full.endsWith('.d.ts') && !full.endsWith('.test.ts') && !full.endsWith('.spec.ts')) {
      acc.push(relative(repoRoot, full));
    }
  }
  return acc;
}

const files = [];

if (chunk.explicitRoots) {
  // Explicit-roots mode (used by `platform` chunk): walk a fixed list.
  for (const root of chunk.explicitRoots) {
    try {
      statSync(root);
    } catch {
      console.error(`[verify:imports:${chunkName}] root '${root}' not found — skipping`);
      continue;
    }
    collectTsFiles(root, files);
  }
} else {
  // Enumerate sibling directories of the chunk parent (e.g. packages/*, services/*)
  let parentEntries;
  try {
    parentEntries = readdirSync(chunk.parent, { withFileTypes: true });
  } catch {
    console.error(`[verify:imports:${chunkName}] parent directory '${chunk.parent}' not found`);
    process.exit(0);
  }

  for (const e of parentEntries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('_')) continue;
    const srcDir = join(chunk.parent, e.name, chunk.srcSuffix);
    try {
      statSync(srcDir);
    } catch {
      continue;
    }
    collectTsFiles(srcDir, files);
  }
}

if (files.length === 0) {
  const where = chunk.explicitRoots ? chunk.explicitRoots.join(', ') : `${chunk.parent}/*/${chunk.srcSuffix}`;
  console.error(`[verify:imports:${chunkName}] no .ts files found under ${where}`);
  process.exit(0);
}

const label = chunk.explicitRoots ? chunk.explicitRoots.join(', ') : `${chunk.parent}/*/${chunk.srcSuffix}`;
console.log(`[verify:imports:${chunkName}] cruising ${files.length} .ts files across ${label}`);

// dependency-cruiser has argv length limits on some shells, so chunk into
// batches of at most 500 files per invocation and aggregate the exit code.
const BATCH = 500;
let worstStatus = 0;
for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH);
  const args = [
    'dependency-cruiser',
    '--config', '.dependency-cruiser.cjs',
    '--output-type', 'err',
    ...batch,
  ];
  const result = spawnSync('npx', args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  const status = result.status ?? 1;
  if (status !== 0 && status > worstStatus) worstStatus = status;
}

process.exit(worstStatus);
