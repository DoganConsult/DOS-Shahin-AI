#!/usr/bin/env node
/**
 * lint-v1-1-no-auto-execute
 *
 * Doctrine: preflight SQL files in
 *   platform/ui-system/dos-ui-system/dogan_shahin_all_contracts_v1_1_operating_runtime/preflight/migrations/
 * are review-only. They MUST NOT be referenced by:
 *   - scripts/migrate.* entry points
 *   - scripts/module/publish.mjs
 *   - duplicated under platform/dos/migrations/public/
 *
 * Output: proofs/foundation-ai/post-launch/v1-1/no-auto-execute.proof.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PRE_DIR = path.join(
  ROOT,
  'platform',
  'ui-system',
  'dos-ui-system',
  'dogan_shahin_all_contracts_v1_1_operating_runtime',
  'preflight',
  'migrations',
);
const MIGRATE_GLOB_DIR = path.join(ROOT, 'scripts');
const PUB_PUBLISH = path.join(ROOT, 'scripts', 'module', 'publish.mjs');
const PROD_MIGRATIONS = path.join(ROOT, 'platform', 'dos', 'migrations', 'public');
const PROOF = path.join(
  ROOT,
  'proofs',
  'foundation-ai',
  'post-launch',
  'v1-1',
  'no-auto-execute.proof.json',
);

const useJson = process.argv.includes('--json') || process.argv.includes('-j');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/ci-guards/lint-v1-1-no-auto-execute.mjs [--json]');
  process.exit(0);
}

const failures = [];

function listSqlNames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith('.sql'));
}

const preflightSqlNames = listSqlNames(PRE_DIR);

function scanFileForSqlReferences(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const body = fs.readFileSync(filePath, 'utf8');
  const hits = [];
  for (const sql of preflightSqlNames) {
    const idx = body.indexOf(sql);
    if (idx !== -1) hits.push(sql);
  }
  return hits;
}

const migrateScripts = fs.existsSync(MIGRATE_GLOB_DIR)
  ? fs.readdirSync(MIGRATE_GLOB_DIR).filter((n) => /^migrate(\.|-)/.test(n)).map((n) => path.join(MIGRATE_GLOB_DIR, n))
  : [];

for (const ms of migrateScripts) {
  const hits = scanFileForSqlReferences(ms);
  if (hits.length) failures.push({ kind: 'migrate_script_references_preflight', script: path.relative(ROOT, ms), preflightFiles: hits });
}

const publishHits = scanFileForSqlReferences(PUB_PUBLISH);
if (publishHits.length) failures.push({ kind: 'publish_script_references_preflight', script: path.relative(ROOT, PUB_PUBLISH), preflightFiles: publishHits });

if (fs.existsSync(PROD_MIGRATIONS)) {
  const prodNames = new Set(fs.readdirSync(PROD_MIGRATIONS));
  for (const sql of preflightSqlNames) {
    if (prodNames.has(sql)) {
      failures.push({ kind: 'preflight_sql_duplicated_into_production', sqlName: sql });
    }
  }
}

const result = {
  guardId: 'lint-v1-1-no-auto-execute',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  preflightSqlCount: preflightSqlNames.length,
  failureCount: failures.length,
  failures,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(PROOF), { recursive: true });
fs.writeFileSync(PROOF, JSON.stringify(result, null, 2) + '\n', 'utf8');

if (useJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[lint-v1-1-no-auto-execute] ${result.status} (${preflightSqlNames.length} preflight SQL files, ${failures.length} failures)`);
  if (failures.length) {
    for (const f of failures.slice(0, 25)) console.log('  -', JSON.stringify(f));
    if (failures.length > 25) console.log(`  … (${failures.length - 25} more)`);
  }
}

process.exit(failures.length ? 1 : 0);
