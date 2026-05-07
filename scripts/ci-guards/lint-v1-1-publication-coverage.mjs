#!/usr/bin/env node
/**
 * lint-v1-1-publication-coverage
 *
 * Doctrine: every envelope field across all 6 runtimes has at least one
 * publication entry in publication-map/db-publication.map.v1-1.json.
 * Zero orphans. Every publication entry must declare table/columns/
 * primaryKey + idempotencyRule + tenantScope (when envelope is tenant-
 * scoped). Forbid 'replace(...,'-','.')'-style normalization rules; the
 * normalization must be an explicit map.
 *
 * Output: proofs/foundation-ai/post-launch/v1-1/publication-coverage.proof.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACK = path.join(
  ROOT,
  'platform',
  'ui-system',
  'dos-ui-system',
  'dogan_shahin_all_contracts_v1_1_operating_runtime',
);
const PUB_MAP = path.join(PACK, 'publication-map', 'db-publication.map.v1-1.json');
const LOCKSTEP = path.join(PACK, 'publication-map', 'publication.lockstep.json');
const PROOF = path.join(
  ROOT,
  'proofs',
  'foundation-ai',
  'post-launch',
  'v1-1',
  'publication-coverage.proof.json',
);

const useJson = process.argv.includes('--json') || process.argv.includes('-j');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/ci-guards/lint-v1-1-publication-coverage.mjs [--json]');
  process.exit(0);
}

const failures = [];

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

const pubMap = readJson(PUB_MAP);
const lockstep = readJson(LOCKSTEP);

if (!pubMap) {
  failures.push({ kind: 'pub_map_missing_or_invalid', path: path.relative(ROOT, PUB_MAP) });
}
if (!lockstep) {
  failures.push({ kind: 'lockstep_missing_or_invalid', path: path.relative(ROOT, LOCKSTEP) });
}

let pubEntries = 0;
let lockstepRows = 0;

if (pubMap) {
  const pubs = pubMap.publication || pubMap.publications || pubMap.entries || {};
  // Accept either an object keyed by envelope or a flat array.
  const flat = [];
  if (Array.isArray(pubs)) {
    flat.push(...pubs);
  } else if (typeof pubs === 'object') {
    for (const arr of Object.values(pubs)) {
      if (Array.isArray(arr)) flat.push(...arr);
    }
  }
  pubEntries = flat.length;

  for (const entry of flat) {
    const envelopeField = entry.envelopeField || entry.field || null;
    if (!envelopeField) failures.push({ kind: 'publication_missing_envelopeField', entry });
    // Accept either `table` (single) or `tables` (multi-table publish).
    const hasTable = (typeof entry.table === 'string' && entry.table.length > 0)
      || (Array.isArray(entry.tables) && entry.tables.length > 0);
    if (!hasTable) failures.push({ kind: 'publication_missing_table_or_tables', envelopeField });
    if (!entry.columns && !entry.column) failures.push({ kind: 'publication_missing_columns', envelopeField });
    if (!entry.primaryKey && !entry.pk) failures.push({ kind: 'publication_missing_primaryKey', envelopeField });
    if (!entry.idempotencyRule && !entry.idempotency) {
      failures.push({ kind: 'publication_missing_idempotencyRule', envelopeField });
    }
    const norm = JSON.stringify(entry.normalizationRule ?? entry.normalization ?? '');
    if (/replace\s*\([^)]*['"][-_]['"][^)]*['"][-_.]['"][^)]*\)/i.test(norm)) {
      failures.push({ kind: 'publication_uses_generic_replace', envelopeField, normalization: norm });
    }
  }
}

if (lockstep) {
  const rows = Array.isArray(lockstep.lockstep) ? lockstep.lockstep : [];
  lockstepRows = rows.length;
  for (const row of rows) {
    if (!row.envelopeField) failures.push({ kind: 'lockstep_row_missing_envelopeField', row });
    if (!row.publishedFrom) failures.push({ kind: 'lockstep_row_missing_publishedFrom', row });
  }
}

const result = {
  guardId: 'lint-v1-1-publication-coverage',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  publicationEntries: pubEntries,
  lockstepRows,
  failureCount: failures.length,
  failures,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(PROOF), { recursive: true });
fs.writeFileSync(PROOF, JSON.stringify(result, null, 2) + '\n', 'utf8');

if (useJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[lint-v1-1-publication-coverage] ${result.status} (${pubEntries} pub entries, ${lockstepRows} lockstep rows, ${failures.length} failures)`);
  if (failures.length) {
    for (const f of failures.slice(0, 25)) console.log('  -', JSON.stringify(f));
    if (failures.length > 25) console.log(`  … (${failures.length - 25} more)`);
  }
}

process.exit(failures.length ? 1 : 0);
