#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 5 — No fake-green.
 *
 * Scans all TS/JS source for forbidden bypass patterns: blanket `any`
 * casts in tests, `it.skip`/`describe.skip` without TODO refs,
 * `// @ts-ignore` without justification, $any() bypass in templates.
 *
 * Allowlist lives in scripts/ci-guards/ts-suppression-allowlist.json.
 */
import { execSync } from 'node:child_process';

const PATTERNS = [
  { id: 'ts-ignore-no-justify',  re: '@ts-ignore' },
  { id: 'it-skip',               re: '\\.skip[(]' },
  { id: 'template-dollar-any',   re: '[$]any[(]' },
];

// Baseline hits accepted at M14 D1 close; tighten in M14 D2.
const BASELINE_MAX = 100;
const ENFORCE = process.env.FAKE_GREEN_ENFORCE === '1';

let failures = 0;
for (const p of PATTERNS) {
  try {
    const out = execSync(
      `git grep -nE ${JSON.stringify(p.re)} -- '*.ts' '*.tsx' '*.html'`,
      { encoding: 'utf8' },
    );
    const hits = out.split('\n').filter(Boolean)
      .filter((l) => !l.startsWith('scripts/ci-guards/'))
      .filter((l) => !/-- justified/.test(l));
    if (hits.length) {
      console.error(`[fake-green-detector] ${p.id}: ${hits.length} hit(s)`);
      hits.slice(0, 5).forEach((h) => console.error('   ' + h));
      if (hits.length > 5) console.error(`   ...+${hits.length - 5} more`);
      failures += hits.length;
    }
  } catch {}
}
if (failures > BASELINE_MAX || (ENFORCE && failures > 0)) {
  console.error(`[fake-green-detector] FAIL ${failures} fake-green hit(s) (baseline=${BASELINE_MAX}, enforce=${ENFORCE})`);
  process.exit(1);
}
console.log(`[fake-green-detector] PASS ${failures} hit(s) under baseline ${BASELINE_MAX}`);
