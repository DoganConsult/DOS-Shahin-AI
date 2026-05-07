#!/usr/bin/env node
/**
 * lint-v1-1-envelope-coverage
 *
 * Doctrine: every envelope file in v1.1 has at least one consumption-map
 * component referencing it (runtimeEnvelope or secondaryEnvelopes), and
 * every consumption-map component references an envelope that exists.
 *
 * Output: proofs/foundation-ai/post-launch/v1-1/envelope-coverage.proof.json
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
const ENVELOPES_DIR = path.join(PACK, 'envelopes');
const CONSUMPTION_MAP = path.join(PACK, 'consumption-map', 'frontend.consumption.map.v1-1.json');
const PROOF = path.join(
  ROOT,
  'proofs',
  'foundation-ai',
  'post-launch',
  'v1-1',
  'envelope-coverage.proof.json',
);

const useJson = process.argv.includes('--json') || process.argv.includes('-j');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/ci-guards/lint-v1-1-envelope-coverage.mjs [--json]');
  process.exit(0);
}

const failures = [];

function envelopeNameFromFile(name) {
  // workspace-runtime.envelope.v1-1.json -> workspace-runtime
  const m = name.match(/^([a-z0-9-]+)\.envelope\.v1-1\.json$/i);
  return m ? m[1] : null;
}

let envelopeFiles = [];
let envelopeNames = new Set();

if (!fs.existsSync(ENVELOPES_DIR)) {
  failures.push({ kind: 'envelopes_dir_missing', path: path.relative(ROOT, ENVELOPES_DIR) });
} else {
  envelopeFiles = fs.readdirSync(ENVELOPES_DIR).filter((n) => n.endsWith('.envelope.v1-1.json'));
  for (const f of envelopeFiles) {
    const name = envelopeNameFromFile(f);
    if (!name) failures.push({ kind: 'envelope_filename_unparseable', file: f });
    else envelopeNames.add(name);
  }
}

const consumed = new Set();
let componentCount = 0;
if (!fs.existsSync(CONSUMPTION_MAP)) {
  failures.push({ kind: 'consumption_map_missing', path: path.relative(ROOT, CONSUMPTION_MAP) });
} else {
  const cm = JSON.parse(fs.readFileSync(CONSUMPTION_MAP, 'utf8'));
  const components = Array.isArray(cm.components) ? cm.components : [];
  componentCount = components.length;
  for (const c of components) {
    const refs = [c.runtimeEnvelope, ...(Array.isArray(c.secondaryEnvelopes) ? c.secondaryEnvelopes : [])].filter(Boolean);
    for (const r of refs) consumed.add(r);
    if (!c.runtimeEnvelope) failures.push({ kind: 'component_missing_runtimeEnvelope', componentId: c.componentId });
    for (const r of refs) {
      if (!envelopeNames.has(r)) {
        failures.push({ kind: 'component_references_unknown_envelope', componentId: c.componentId, envelope: r });
      }
    }
  }
}

for (const env of envelopeNames) {
  if (!consumed.has(env)) {
    failures.push({ kind: 'orphan_envelope_not_consumed', envelope: env });
  }
}

if (envelopeNames.size < 6) {
  failures.push({ kind: 'envelope_count_below_six', actual: envelopeNames.size });
}

const result = {
  guardId: 'lint-v1-1-envelope-coverage',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  envelopeCount: envelopeNames.size,
  componentCount,
  failureCount: failures.length,
  failures,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(PROOF), { recursive: true });
fs.writeFileSync(PROOF, JSON.stringify(result, null, 2) + '\n', 'utf8');

if (useJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[lint-v1-1-envelope-coverage] ${result.status} (${envelopeNames.size} envelopes, ${componentCount} components, ${failures.length} failures)`);
  if (failures.length) {
    for (const f of failures.slice(0, 25)) console.log('  -', JSON.stringify(f));
    if (failures.length > 25) console.log(`  … (${failures.length - 25} more)`);
  }
}

process.exit(failures.length ? 1 : 0);
