#!/usr/bin/env node
// Foundation-AI quality gate. Loads gates/wave-<N>.json and runs each check.

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const wave = Number(args.wave ?? process.env.PROGRAM_WAVE ?? -2);

const gateFile = join(process.cwd(), `scripts/program/foundation-ai/gates/wave-${wave}.json`);
if (!existsSync(gateFile)) {
  console.error(`gate manifest missing: ${gateFile}`);
  process.exit(2);
}
const gate = JSON.parse(readFileSync(gateFile, 'utf8'));

const results = [];
for (const check of gate.checks ?? []) {
  const start = Date.now();
  let status = 'GREEN';
  let output = '';
  try {
    output = execSync(check.cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    status = check.required === false ? 'WARN' : 'RED';
    output = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '');
  }
  results.push({ id: check.id, status, ms: Date.now() - start, snippet: output.split('\n').slice(-3).join('\n') });
}

const status = results.every((r) => r.status !== 'RED') ? 'GREEN' : 'RED';
const payload = { schema: 'foundation-ai.gate.v1', wave, results };
console.log(JSON.stringify({ status, results }, null, 2));
emitProof({ phase: -2, wave, name: 'quality-gate', payload, status, kind: 'GATE' });
process.exit(status === 'GREEN' ? 0 : 1);
