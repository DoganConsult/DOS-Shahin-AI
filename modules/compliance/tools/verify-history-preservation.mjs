#!/usr/bin/env node
// Confirms `git log --follow` reaches commits from before the rename for a
// random sample of moved files. Run after `inbound-consolidate.sh --apply`
// (and before the move commit) to catch any case where git failed to detect
// the rename (e.g. if a file was edited mid-move).
//
// Usage: node modules/compliance/tools/verify-history-preservation.mjs [sample_size]
//
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = resolve(SCRIPT_DIR, '../../..');
const REPORT = resolve(PLATFORM_ROOT, 'modules/compliance/_inbound/_move-report.txt');
const SAMPLE = Number(process.argv[2] ?? 10);

if (!existsSync(REPORT)) {
  console.error(`No move report at ${REPORT}. Run inbound-consolidate.sh --apply first.`);
  process.exit(2);
}

const lines = readFileSync(REPORT, 'utf8')
  .split('\n')
  .filter((l) => l.includes(' -> '));

if (lines.length === 0) {
  console.error('Move report has no entries.');
  process.exit(2);
}

// Random sample without replacement.
const picks = [...lines].sort(() => Math.random() - 0.5).slice(0, SAMPLE);

let ok = 0;
let fail = 0;
for (const line of picks) {
  const [, dst] = line.split(' -> ');
  const log = execSync(`git log --follow --oneline -- "${dst.trim()}"`, {
    cwd: PLATFORM_ROOT,
    encoding: 'utf8',
  });
  const commits = log.trim().split('\n').filter(Boolean);
  if (commits.length >= 2) {
    ok++;
    console.log(`  OK   ${dst.trim()} (${commits.length} commits)`);
  } else {
    fail++;
    console.log(`  FAIL ${dst.trim()} (${commits.length} commits — history may be lost)`);
  }
}

console.log(`\nSampled ${picks.length}: ${ok} OK, ${fail} FAIL.`);
process.exit(fail === 0 ? 0 : 1);
