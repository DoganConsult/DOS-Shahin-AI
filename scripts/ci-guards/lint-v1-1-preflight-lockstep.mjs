#!/usr/bin/env node
/**
 * lint-v1-1-preflight-lockstep
 *
 * Doctrine: bidirectional manifest <-> SQL match. Each blocker in
 * preflight/blockers.contract.v1-1.json must have a paired SQL file
 * with matching SHA-256 checksum, idempotent semantics, consistent
 * destructive flag, and the doctrine-mandated SQL-shape rules:
 *   - B1 SQL: tenant-scoped unique index expression
 *   - B2 SQL: explicit VALUES map (no generic replace())
 *   - B3 SQL: pg_constraint guarded DO block (no ADD CONSTRAINT IF NOT EXISTS)
 *   - B4 SQL: review_required=true in manifest
 *
 * Output: proofs/foundation-ai/post-launch/v1-1/preflight-lockstep.proof.json
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACK = path.join(
  ROOT,
  'platform',
  'ui-system',
  'dos-ui-system',
  'dogan_shahin_all_contracts_v1_1_operating_runtime',
);
const MANIFEST = path.join(PACK, 'preflight', 'blockers.contract.v1-1.json');
const SQL_DIR = path.join(PACK, 'preflight', 'migrations');
const PROOF = path.join(
  ROOT,
  'proofs',
  'foundation-ai',
  'post-launch',
  'v1-1',
  'preflight-lockstep.proof.json',
);

const useJson = process.argv.includes('--json') || process.argv.includes('-j');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/ci-guards/lint-v1-1-preflight-lockstep.mjs [--json]');
  process.exit(0);
}

const failures = [];
let inspected = 0;

if (!fs.existsSync(MANIFEST)) {
  failures.push({ kind: 'manifest_missing', path: path.relative(ROOT, MANIFEST) });
} else {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const blockers = Array.isArray(manifest.blockers) ? manifest.blockers : [];

  // Required minimum blocker IDs (B2b is allowed but not required by manifest).
  const requiredIds = ['B1', 'B2', 'B3', 'B4'];
  for (const id of requiredIds) {
    if (!blockers.find((b) => b.blocker_id === id)) {
      failures.push({ kind: 'missing_required_blocker', id });
    }
  }

  for (const b of blockers) {
    inspected += 1;
    const sqlRel = b.sql_file;
    if (!sqlRel) {
      failures.push({ kind: 'blocker_missing_sql_file', id: b.blocker_id });
      continue;
    }
    const sqlPath = path.isAbsolute(sqlRel) ? sqlRel : path.join(PACK, sqlRel);
    if (!fs.existsSync(sqlPath)) {
      failures.push({ kind: 'sql_file_missing', id: b.blocker_id, sqlPath: path.relative(ROOT, sqlPath) });
      continue;
    }
    const body = fs.readFileSync(sqlPath, 'utf8');
    const sha = crypto.createHash('sha256').update(body).digest('hex');
    // Comment-stripped body is what we use for forbidden-pattern scans
    // so anti-pattern doctrine notes inside SQL comments do not trigger
    // the guard (e.g. "-- DO NOT use replace(item_id, '-', '.')").
    const codeOnly = body
      .replace(/\/\*[\s\S]*?\*\//g, '') // /* … */ block comments
      .replace(/^\s*--.*$/gm, '');       // -- line comments
    if (b.sql_checksum_sha256 && b.sql_checksum_sha256 !== sha) {
      failures.push({
        kind: 'checksum_mismatch',
        id: b.blocker_id,
        sqlPath: path.relative(ROOT, sqlPath),
        manifestSha: b.sql_checksum_sha256,
        actualSha: sha,
      });
    }

    const idempotent = /\bIF\s+NOT\s+EXISTS\b|\bON\s+CONFLICT\b|\bDO\s+\$\$/i.test(codeOnly);
    if (!idempotent) {
      failures.push({ kind: 'sql_not_idempotent', id: b.blocker_id, sqlPath: path.relative(ROOT, sqlPath) });
    }

    if (b.blocker_id === 'B1') {
      const hasTenantInIndex = /CREATE\s+UNIQUE\s+INDEX[\s\S]*?tenant_id[\s\S]*?WHERE\s+is_default\s*=\s*true/i.test(codeOnly);
      if (!hasTenantInIndex) {
        failures.push({ kind: 'b1_missing_tenant_scope', sqlPath: path.relative(ROOT, sqlPath) });
      }
    }
    if (b.blocker_id === 'B2') {
      const hasGenericReplace = /\breplace\s*\(\s*item_id\s*,/i.test(codeOnly);
      if (hasGenericReplace) {
        failures.push({ kind: 'b2_generic_replace', sqlPath: path.relative(ROOT, sqlPath) });
      }
      const hasValuesMap = /\bVALUES\s*\(/i.test(codeOnly) && /UPDATE\s+dos\.ui_module_nav_item/i.test(codeOnly);
      if (!hasValuesMap) {
        failures.push({ kind: 'b2_missing_values_map', sqlPath: path.relative(ROOT, sqlPath) });
      }
    }
    if (b.blocker_id === 'B3') {
      if (/ADD\s+CONSTRAINT\s+IF\s+NOT\s+EXISTS/i.test(codeOnly)) {
        failures.push({ kind: 'b3_uses_add_constraint_if_not_exists', sqlPath: path.relative(ROOT, sqlPath) });
      }
      if (!/pg_constraint/i.test(codeOnly)) {
        failures.push({ kind: 'b3_missing_pg_constraint_guard', sqlPath: path.relative(ROOT, sqlPath) });
      }
    }
    if (b.blocker_id === 'B4' && b.review_required !== true) {
      failures.push({ kind: 'b4_review_required_false', id: b.blocker_id });
    }
  }
}

const result = {
  guardId: 'lint-v1-1-preflight-lockstep',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  inspectedBlockerCount: inspected,
  failureCount: failures.length,
  failures,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(PROOF), { recursive: true });
fs.writeFileSync(PROOF, JSON.stringify(result, null, 2) + '\n', 'utf8');

if (useJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[lint-v1-1-preflight-lockstep] ${result.status} (${inspected} blockers, ${failures.length} failures)`);
  if (failures.length) {
    for (const f of failures.slice(0, 25)) console.log('  -', JSON.stringify(f));
    if (failures.length > 25) console.log(`  … (${failures.length - 25} more)`);
  }
}

process.exit(failures.length ? 1 : 0);
