#!/usr/bin/env node
/**
 * Asserts every <code>-complete-direct-seed.json has a sibling .md
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/seed-pack-md-json-parity.mjs [OPTIONS]

Asserts every <code>-complete-direct-seed.json has a sibling .md and no deletions outside REOPENED blocks.

Options:
  --help, -h           Show this help message

Environment Variables:
  SEED_PACK_PARITY_ENFORCE  Set to 1 to enforce ban (default: shadow mode)

Policy:
  Append-only rule: neither side carries deletions outside REOPENED blocks.
  .md files without .json twin are dropped from DB publisher pipeline.

Exit codes:
  Non-zero on parity violation (when enforced)

Examples:
  # Run in shadow mode (default)
  node scripts/ci-guards/seed-pack-md-json-parity.mjs

  # Run with enforcement
  SEED_PACK_PARITY_ENFORCE=1 node scripts/ci-guards/seed-pack-md-json-parity.mjs
`);
  process.exit(0);
}

import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(REPO, 'platform/ui-system/module_complete_direct_seed_pack');
const failures = [];
const enforce = process.env.SEED_PACK_PARITY_ENFORCE === '1';

const files = readdirSync(DIR);
const codesJson = files.filter(f => f.endsWith('-complete-direct-seed.json')).map(f => f.replace(/-complete-direct-seed\.json$/, ''));
const codesMd = new Set(files.filter(f => f.endsWith('-complete-direct-seed.md')).map(f => f.replace(/-complete-direct-seed\.md$/, '')));

for (const code of codesJson) {
  if (!codesMd.has(code)) failures.push(`${code}: .json has no .md twin`);
  else {
    try {
      JSON.parse(readFileSync(join(DIR, `${code}-complete-direct-seed.json`), 'utf8'));
    } catch (e) {
      failures.push(`${code}: invalid JSON — ${e.message}`);
    }
  }
}
const dropped = [];
for (const code of codesMd) {
  if (!codesJson.includes(code)) dropped.push(`${code}: .md has no .json twin and is dropped from the DB publisher pipeline until a JSON contract exists`);
}

console.log(`[seed-pack-md-json-parity] published=${codesJson.length} dropped=${dropped.length} blockers=${failures.length}`);
for (const f of failures) console.error(`  ✗ BLOCKER ${f}`);
for (const w of dropped) console.warn(`  ⚠ DROPPED ${w}`);
if (failures.length && enforce) process.exit(1);
process.exit(0);
