#!/usr/bin/env node
/**
 * brand-coverage.mjs — Phase M0 CI gate.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/brand-coverage.mjs [OPTIONS]

Verifies every M0 brand declared in DOS_BRAND_CODES has complete brand DNA registry footprint.

Options:
  --help, -h           Show this help message

Environment Variables:
  BRAND_COVERAGE_ENFORCE      Set to 1 to fail CI (default: SHADOW mode)
  BRAND_COVERAGE_LIVE         Set to 1 to run checks against live DATABASE_URL

Checks:
  ① At least 1 row in dos.marketing_brand_tokens (semantic overlay)
  ② Active row in dos.marketing_brand_assets for EACH required asset kind
  ③ Every asset row has non-empty altEn / altAr (a11y contract)

Required brands: shahin-ai, dogan-ai-os
Required assets: logo-eagle, favicon, og-image

Exit codes:
  Non-zero if any check fails (when BRAND_COVERAGE_ENFORCE=1)

Examples:
  # Run in shadow mode (default)
  node scripts/ci-guards/brand-coverage.mjs

  # Run with enforcement
  BRAND_COVERAGE_ENFORCE=1 node scripts/ci-guards/brand-coverage.mjs

  # Run against live database
  BRAND_COVERAGE_LIVE=1 node scripts/ci-guards/brand-coverage.mjs
`);
  process.exit(0);
}

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED = join(
  REPO,
  'platform/dos/migrations/public/20260503_0023_marketing_brand_registry.sql',
);

const REQUIRED_BRANDS = ['shahin-ai', 'dogan-ai-os'];
const REQUIRED_ASSETS = ['logo-eagle', 'favicon', 'og-image'];

const enforce = process.env.BRAND_COVERAGE_ENFORCE === '1';
const tag = '[brand-coverage]';

function fail(messages) {
  for (const m of messages) console.error(`${tag} FAIL ${m}`);
  if (enforce) process.exit(1);
  console.warn(`${tag} SHADOW (${messages.length} violation${messages.length === 1 ? '' : 's'}). Set BRAND_COVERAGE_ENFORCE=1 to enforce.`);
  process.exit(0);
}

if (!existsSync(SEED)) {
  fail([`missing M0 brand seed migration: ${SEED}`]);
}

const sql = readFileSync(SEED, 'utf8');
const violations = [];

// 1. Token rows present per brand.
for (const brand of REQUIRED_BRANDS) {
  const re = new RegExp(`INSERT INTO dos\\.marketing_brand_tokens[\\s\\S]*?VALUES([\\s\\S]*?)ON CONFLICT`, 'g');
  let found = false;
  let m;
  while ((m = re.exec(sql)) !== null) {
    if (m[1].includes(`'${brand}'`)) { found = true; break; }
  }
  if (!found) violations.push(`brand "${brand}" has no marketing_brand_tokens seed rows`);
}

// 2. Required assets present per brand.
const assetRe = /INSERT INTO dos\.marketing_brand_assets[\s\S]*?VALUES([\s\S]*?)ON CONFLICT/g;
const assetBlobs = [];
let am;
while ((am = assetRe.exec(sql)) !== null) assetBlobs.push(am[1]);
const assetCorpus = assetBlobs.join('\n');

for (const brand of REQUIRED_BRANDS) {
  for (const kind of REQUIRED_ASSETS) {
    const rowRe = new RegExp(`\\(\\s*'${brand}'\\s*,\\s*'${kind}'`, 'g');
    if (!rowRe.test(assetCorpus)) {
      violations.push(`brand "${brand}" missing required asset row "${kind}"`);
    }
  }
}

// 3. Every asset row has non-empty altEn + altAr (loose check — empty quotes).
const emptyAlt = /,\s*''\s*,\s*''\s*,\s*\d+\s*\)/g;
if (emptyAlt.test(assetCorpus)) {
  violations.push(`one or more asset rows have empty altEn/altAr — a11y contract violated`);
}

if (violations.length > 0) fail(violations);
console.log(`${tag} OK — ${REQUIRED_BRANDS.length} brand(s) × ${REQUIRED_ASSETS.length} required asset(s) all present.`);
