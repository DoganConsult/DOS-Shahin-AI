#!/usr/bin/env node
/**
 * Removes obsolete `// @ts-ignore - cron property mismatch` lines from TS sources.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SKIP = new Set(['node_modules', 'dist', '.pnpm', '.angular', 'coverage', '.git', '.next', '.cache']);

const LINE_RE = /^\s*\/\/ @ts-ignore - cron property mismatch\s*$/;

function* walk(dir) {
  let ent;
  try {
    ent = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ent) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && /\.(ts|tsx|mts|cts)$/.test(e.name)) yield p;
  }
}

let files = 0;
let removed = 0;
for (const file of walk(ROOT)) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const next = lines.filter((ln) => !LINE_RE.test(ln));
  const cut = lines.length - next.length;
  if (cut > 0) {
    files++;
    removed += cut;
    fs.writeFileSync(file, next.join('\n') + (text.endsWith('\n') ? '\n' : ''), 'utf8');
  }
}
console.log(`strip-cron-ts-ignore: ${removed} line(s) in ${files} file(s)`);
