#!/usr/bin/env node
// Foundation-AI plan-sync.
// Reads program.master.json and regenerates per-wave specs + gates deterministically.
// Single source of truth = best practice. Per-wave files are derived artifacts.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';
import { sha256 } from './lib/ledger.mjs';

const ROOT = process.cwd();
const SPECS_DIR = join(ROOT, 'scripts/program/foundation-ai/specs');
const GATES_DIR = join(ROOT, 'scripts/program/foundation-ai/gates');

const master = JSON.parse(readFileSync(join(SPECS_DIR, 'program.master.json'), 'utf8'));
if (master.schema !== 'foundation-ai.program.master.v2') {
  console.error(`master plan schema must be foundation-ai.program.master.v2 (got ${master.schema})`);
  process.exit(2);
}

const REQUIRED_KEYS = ['phase', 'title', 'wave', 'commitType', 'objective', 'preconditions', 'deliverables', 'steps', 'acceptanceChecks', 'scopeAllowlist'];
const written = [];
const errors = [];

for (const p of master.phases ?? []) {
  for (const k of REQUIRED_KEYS) {
    if (!(k in p)) errors.push(`phase ${p.phase}: missing key ${k}`);
  }
  if (errors.length) continue;

  const wave = p.wave;
  const spec = {
    schema: 'foundation-ai.wave.v2',
    wave,
    phase: p.phase,
    title: p.title,
    commitType: p.commitType,
    objective: p.objective,
    preconditions: p.preconditions,
    deliverables: p.deliverables,
    steps: p.steps,
    acceptanceChecks: p.acceptanceChecks,
    scopeAllowlist: p.scopeAllowlist,
    rollback: p.rollback ?? null,
    derivedFrom: 'program.master.json',
  };
  spec.hash = sha256(spec);

  const gate = {
    schema: 'foundation-ai.gate.v2',
    wave,
    phase: p.phase,
    derivedFrom: 'program.master.json',
    checks: [
      { id: 'inventory_runs', cmd: 'node scripts/program/foundation-ai/inventory.mjs > /dev/null' },
      ...p.acceptanceChecks.map((c) => ({ id: c.id, cmd: c.cmd })),
      { id: 'zerodirt', cmd: `PROGRAM_WAVE=${wave} node scripts/program/foundation-ai/zerodirt.mjs`, required: wave <= 0 ? false : true },
    ],
  };
  gate.hash = sha256(gate);

  const specFile = join(SPECS_DIR, `wave.${wave}.spec.json`);
  const gateFile = join(GATES_DIR, `wave-${wave}.json`);
  writeFileSync(specFile, JSON.stringify(spec, null, 2) + '\n');
  writeFileSync(gateFile, JSON.stringify(gate, null, 2) + '\n');
  written.push({ wave, specFile, gateFile, specHash: spec.hash, gateHash: gate.hash });
}

const payload = {
  schema: 'foundation-ai.plan-sync.v1',
  masterHash: sha256(master),
  phases: master.phases?.length ?? 0,
  written,
  errors,
};
console.log(JSON.stringify(payload, null, 2));

const status = errors.length ? 'RED' : 'GREEN';
emitProof({ phase: 'P-2', wave: -2, name: 'plan-sync', payload, status, kind: 'PLAN_SYNC' });
process.exit(status === 'GREEN' ? 0 : 1);
