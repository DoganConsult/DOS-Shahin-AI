#!/usr/bin/env node
/**
 * Guard: access-review migration lineage must stay canonical.
 *
 * Canonical CREATE TABLE lineage for:
 *   - dos.access_reviews
 *   - dos.access_review_items
 * lives only in DOS public migration 20260425_0005. This guard freezes
 * lineage so no duplicate table-creation migrations are introduced.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(process.cwd());
const DOS_PUBLIC = join(ROOT, 'platform', 'dos', 'migrations', 'public');
const FOUNDATION = join(ROOT, 'platform', 'foundation', 'db', 'migrations');

const ALLOWLIST = new Set([
  join(DOS_PUBLIC, '20260425_0005_access_review_tables.sql'),
]);

const NEEDLES = [
  /create\s+table\s+if\s+not\s+exists\s+dos\.access_reviews\b/i,
  /create\s+table\s+if\s+not\s+exists\s+dos\.access_review_items\b/i,
];

function listSql(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => join(dir, f));
}

const files = [...listSql(DOS_PUBLIC), ...listSql(FOUNDATION)];
const matches = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (NEEDLES.some((needle) => needle.test(text))) {
    matches.push(file);
  }
}

const unexpected = matches.filter((m) => !ALLOWLIST.has(m));
if (unexpected.length > 0) {
  console.error('[foundation-access-review-lineage-guard] FAIL unexpected access-review table DDL lineage files:');
  for (const file of unexpected) console.error(`  - ${file}`);
  process.exit(1);
}

if (matches.length === 0) {
  console.error('[foundation-access-review-lineage-guard] FAIL no access-review lineage files found');
  process.exit(1);
}

console.log(`[foundation-access-review-lineage-guard] OK lineage locked (${matches.length} known files)`);
