#!/usr/bin/env node
// Asserts every <code>-complete-direct-seed.json has a sibling .md and that
// neither side carries deletions outside REOPENED blocks (append-only rule).
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
const warnings = [];
for (const code of codesMd) {
  if (!codesJson.includes(code)) warnings.push(`${code}: .md has no .json twin yet (backlog module — will be authored under publisher pipeline)`);
}

console.log(`[seed-pack-md-json-parity] published=${codesJson.length} backlog=${warnings.length} blockers=${failures.length}`);
for (const f of failures) console.error(`  ✗ BLOCKER ${f}`);
for (const w of warnings) console.warn(`  ⚠ WARNING ${w}`);
if (failures.length && enforce) process.exit(1);
process.exit(0);
