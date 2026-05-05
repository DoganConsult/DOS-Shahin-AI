#!/usr/bin/env node
/**
 * Wave F9 — Produce Final Handover Bundle
 *
 * Aggregates all artifacts under `ops/handover/<date>/` into a single
 * tar.gz deliverable suitable for regulator transmission, and produces
 * a `MANIFEST.txt` with sha256 of every file.
 *
 * Usage:
 *   node scripts/handover/produce-bundle.mjs [--date=YYYY-MM-DD]
 *
 * Output:
 *   ops/handover/<date>/MANIFEST.txt
 *   ops/handover/<date>.tar.gz
 *   ops/handover/<date>.tar.gz.sha256
 */

import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dateArg = (process.argv.find(a => a.startsWith('--date=')) || '').split('=')[1];
const today = dateArg || new Date().toISOString().slice(0,10);
const baseDir = join(ROOT, 'ops', 'handover', today);

if (!existsSync(baseDir)) {
  console.error(`[produce-bundle] no handover dir: ${baseDir.replace(ROOT+'/','')}`);
  console.error('[produce-bundle] run `node scripts/handover/foundation-handover.mjs` first');
  process.exit(2);
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const lines = [];
let total = 0;
for (const file of walk(baseDir)) {
  const rel = relative(baseDir, file);
  if (rel === 'MANIFEST.txt') continue;
  const buf = readFileSync(file);
  const hash = createHash('sha256').update(buf).digest('hex');
  const size = buf.length;
  total += size;
  lines.push(`${hash}  ${size}  ${rel}`);
}
lines.sort();
writeFileSync(join(baseDir, 'MANIFEST.txt'),
  `# DOS Handover Manifest — ${today}\n# files: ${lines.length}  total bytes: ${total}\n` +
  lines.join('\n') + '\n');

const tar = `ops/handover/${today}.tar.gz`;
try {
  execSync(`tar -czf ${tar} -C ops/handover ${today}`, { cwd: ROOT, stdio: 'pipe' });
  const tarBuf = readFileSync(join(ROOT, tar));
  const tarHash = createHash('sha256').update(tarBuf).digest('hex');
  writeFileSync(join(ROOT, tar + '.sha256'), `${tarHash}  ${today}.tar.gz\n`);
  console.log(`[produce-bundle] files:   ${lines.length}`);
  console.log(`[produce-bundle] bytes:   ${total}`);
  console.log(`[produce-bundle] tar:     ${tar}`);
  console.log(`[produce-bundle] sha256:  ${tarHash}`);
  process.exit(0);
} catch (e) {
  console.error('[produce-bundle] tar failed:', e.message);
  process.exit(2);
}
