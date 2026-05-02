#!/usr/bin/env node
/** Remove standalone placeholder // @ts-expect-error -- type gap ... lines repo-wide. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.pnpm',
  '.pnpm-store',
  '.angular',
  'coverage',
  '.git',
  '.next',
  '.cache',
]);

const PLACEHOLDER =
  /^\s*\/\/ @ts-expect-error -- type gap: missing explicit types; tracked for resolution \(do not add new suppressions\)\s*$/gm;

function walk(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(p, acc);
    } else if (/\.(tsx?|mts|cts)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
      acc.push(p);
    }
  }
  return acc;
}

let n = 0;
for (const file of walk(REPO_ROOT)) {
  const s0 = fs.readFileSync(file, 'utf8');
  const s1 = s0.replace(PLACEHOLDER, '');
  if (s1 !== s0) {
    fs.writeFileSync(file, s1);
    console.log(path.relative(REPO_ROOT, file));
    n++;
  }
}
console.error(`strip-placeholder: touched ${n} files`);
