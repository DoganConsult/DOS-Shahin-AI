#!/usr/bin/env node
/**
 * lint-v1-1-self-contained
 *
 * Doctrine: every v1.1 contract file carries the v1 surface PLUS the new
 * operating layers. No $ref to v1, no missing v1 fields, every file
 * declares contractKind/contractVersion/runtimeModel.
 *
 * Pass evidence:
 *   - every contractVersion equals '1.1.0'
 *   - every runtimeModel equals 'v1-1-operating-runtime'
 *   - modules directory contains 24 module contract files
 *   - no $ref pointing into the frozen v1 pack
 *
 * Output: proofs/foundation-ai/post-launch/v1-1/lint-self-contained.proof.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACK_DIR = path.join(
  ROOT,
  'platform',
  'ui-system',
  'dos-ui-system',
  'dogan_shahin_all_contracts_v1_1_operating_runtime',
);
const PROOF_PATH = path.join(
  ROOT,
  'proofs',
  'foundation-ai',
  'post-launch',
  'v1-1',
  'lint-self-contained.proof.json',
);

const useJson = process.argv.includes('--json') || process.argv.includes('-j');
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-v1-1-self-contained.mjs [OPTIONS]

Verifies the v1.1 operating runtime pack is self-contained: no v1 $refs,
every contract file declares contractKind/contractVersion/runtimeModel,
and the modules directory contains 24 module contracts.

Options:
  --help, -h           Show this help message
  --json, -j           Output results as structured JSON

Exit codes:
  0 — PASS
  1 — FAIL
`);
  process.exit(0);
}

function walkJson(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJson(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

const failures = [];
const inspected = [];

if (!fs.existsSync(PACK_DIR)) {
  failures.push({ kind: 'pack_missing', path: PACK_DIR });
} else {
  const files = walkJson(PACK_DIR);
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    let body;
    try {
      body = fs.readFileSync(file, 'utf8');
    } catch (err) {
      failures.push({ kind: 'unreadable', file: rel, error: String(err) });
      continue;
    }

    if (/\$ref\s*"\s*[^"]*dogan_shahin_all_contracts_v1_runtime\b/i.test(body)) {
      failures.push({ kind: 'ref_to_v1_pack', file: rel });
    }

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      failures.push({ kind: 'invalid_json', file: rel, error: String(err) });
      continue;
    }

    inspected.push({
      file: rel,
      contractKind: parsed.contractKind ?? null,
      contractVersion: parsed.contractVersion ?? null,
      runtimeModel: parsed.runtimeModel ?? null,
    });

    if (!parsed.contractKind || typeof parsed.contractKind !== 'string') {
      failures.push({ kind: 'missing_contractKind', file: rel });
    }
    if (parsed.contractVersion !== '1.1.0') {
      failures.push({ kind: 'wrong_contractVersion', file: rel, value: parsed.contractVersion ?? null });
    }
    if (parsed.runtimeModel !== 'v1-1-operating-runtime') {
      failures.push({ kind: 'wrong_runtimeModel', file: rel, value: parsed.runtimeModel ?? null });
    }
  }

  // 24 module contract count check.
  const modulesDir = path.join(PACK_DIR, 'modules');
  if (fs.existsSync(modulesDir)) {
    const moduleFiles = fs.readdirSync(modulesDir).filter((n) => n.endsWith('.module.contract.v1-1.json'));
    if (moduleFiles.length !== 24) {
      failures.push({ kind: 'wrong_module_count', expected: 24, actual: moduleFiles.length });
    }
  } else {
    failures.push({ kind: 'modules_dir_missing', path: path.relative(ROOT, modulesDir) });
  }
}

const result = {
  guardId: 'lint-v1-1-self-contained',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  inspectedFileCount: inspected.length,
  failureCount: failures.length,
  failures,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(PROOF_PATH), { recursive: true });
fs.writeFileSync(PROOF_PATH, JSON.stringify(result, null, 2) + '\n', 'utf8');

if (useJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[lint-v1-1-self-contained] ${result.status} (${inspected.length} files, ${failures.length} failures)`);
  if (failures.length) {
    for (const f of failures.slice(0, 25)) console.log('  -', JSON.stringify(f));
    if (failures.length > 25) console.log(`  … (${failures.length - 25} more)`);
  }
}

process.exit(failures.length ? 1 : 0);
