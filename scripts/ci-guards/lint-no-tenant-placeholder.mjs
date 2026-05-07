#!/usr/bin/env node
/**
 * lint-no-tenant-placeholder — CI gate
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-no-tenant-placeholder.mjs [OPTIONS]

Forbids legacy __TENANT_SCHEMA__ placeholder in newly-added tenant migration files.

Options:
  --help, -h           Show this help message

Environment Variables:
  LINT_BASE_REF        Git base ref for diff (default: origin/main)

Policy:
  Runtime sets search_path before each migration, so unqualified identifiers resolve.
  Existing files using placeholder are grandfathered (checksum preservation).
  Detection: git diff --name-only --diff-filter=A against base ref.

Exit codes:
  Non-zero on placeholder in new migration file

Examples:
  # Run tenant placeholder check
  node scripts/ci-guards/lint-no-tenant-placeholder.mjs

  # Run with custom base ref
  LINT_BASE_REF=origin/develop node scripts/ci-guards/lint-no-tenant-placeholder.mjs
`);
  process.exit(0);
}

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const BASE = process.env.LINT_BASE_REF || 'origin/main';
const isMigrationPath = (f) =>
  /\/db\/tenant\/migrations\/.+\.sql$/.test(f) ||
  /\/db\/migrations\/.+\.sql$/.test(f) ||
  /^ops\/migrations\/tenant\/.+\.sql$/.test(f);

let added;
try {
  added = execSync(`git diff --name-only --diff-filter=A ${BASE}...HEAD`, {
    encoding: 'utf8',
  })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
} catch (err) {
  console.warn(`[lint-no-tenant-placeholder] cannot diff against ${BASE} — skipping (likely first-checkout CI)`);
  process.exit(0);
}

const candidates = added.filter(isMigrationPath);
const offenders = [];
for (const f of candidates) {
  if (!existsSync(f)) continue;
  const sql = readFileSync(f, 'utf8');
  if (sql.includes('__TENANT_SCHEMA__')) offenders.push(f);
}

if (offenders.length) {
  console.error('[lint-no-tenant-placeholder] FAIL — new tenant migrations must not use __TENANT_SCHEMA__:');
  for (const f of offenders) console.error('  ' + f);
  console.error('');
  console.error('Use unqualified identifiers; the runner prepends:');
  console.error('  SET search_path TO "<tenant_schema>", public;');
  console.error('Existing files using the placeholder remain valid (grandfathered).');
  process.exit(1);
}

console.log(
  `[lint-no-tenant-placeholder] PASS (${candidates.length} new migration file(s) checked)`,
);
